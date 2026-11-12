import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import type { AcceptInvitationInput, InvitationInput } from "./schema";

export const INVITATION_TTL_DAYS = 7;

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Returns the raw token once; only its hash is stored, so a lost link means a new invitation.
export async function createInvitation(db: PrismaClient, actor: Actor, input: InvitationInput, now = new Date()) {
  const email = input.email.toLowerCase();
  const token = randomBytes(32).toString("base64url");
  return db.$transaction(async (tx) => {
    if (await tx.user.findUnique({ where: { email } })) throw new DomainError("כבר קיים משתמש עם המייל הזה");
    // A new invitation replaces any earlier link sent to the same address.
    await tx.invitation.updateMany({
      where: { organizationId: actor.organizationId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    const invitation = await tx.invitation.create({
      data: {
        organizationId: actor.organizationId,
        email,
        role: input.role,
        tokenHash: hashInvitationToken(token),
        expiresAt: new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
        createdById: actor.userId,
      },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "invitation.create",
      entityType: "Invitation",
      entityId: invitation.id,
      details: { email, role: input.role },
    });
    return { invitation, token };
  });
}

export function listPendingInvitations(db: PrismaClient, organizationId: string, now = new Date()) {
  return db.invitation.findMany({
    where: { organizationId, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  });
}

export function revokeInvitation(db: PrismaClient, actor: Actor, id: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const updated = await tx.invitation.updateMany({
      where: { id, organizationId: actor.organizationId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    if (updated.count === 0) throw new DomainError("ההזמנה לא נמצאה או שכבר אינה פעילה");
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "invitation.revoke",
      entityType: "Invitation",
      entityId: id,
    });
  });
}

// The invitation behind a link, or null when the link is unknown, used, revoked or expired.
export function findUsableInvitation(db: PrismaClient, token: string, now = new Date()) {
  return db.invitation.findFirst({
    where: { tokenHash: hashInvitationToken(token), acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
    select: { id: true, email: true, role: true, organizationId: true, organization: { select: { name: true } } },
  });
}

export async function acceptInvitation(db: PrismaClient, token: string, input: AcceptInvitationInput, now = new Date()) {
  const passwordHash = await hashPassword(input.password);
  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findFirst({
      where: { tokenHash: hashInvitationToken(token), acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
    });
    if (!invitation) throw new DomainError("הקישור אינו בתוקף. בקשו קישור חדש ממנהל המערכת.");
    // Claim the invitation first so the same link cannot create two accounts.
    const claimed = await tx.invitation.updateMany({ where: { id: invitation.id, acceptedAt: null }, data: { acceptedAt: now } });
    if (claimed.count === 0) throw new DomainError("הקישור כבר נוצל");
    if (await tx.user.findUnique({ where: { email: invitation.email } })) throw new DomainError("כבר קיים משתמש עם המייל הזה. אפשר להתחבר.");

    const userId = randomUUID();
    await tx.user.create({ data: { id: userId, name: input.name, email: invitation.email, emailVerified: true } });
    await tx.account.create({ data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: passwordHash } });
    await tx.membership.create({ data: { userId, organizationId: invitation.organizationId, role: invitation.role } });
    await writeAudit(tx, {
      organizationId: invitation.organizationId,
      actorId: userId,
      action: "invitation.accept",
      entityType: "Invitation",
      entityId: invitation.id,
      details: { role: invitation.role },
    });
    return { userId, email: invitation.email };
  });
}
