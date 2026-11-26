import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import type { NewPasswordInput } from "./schema";

export const RESET_LINK_TTL_HOURS = 24;

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Returns the raw token once; only its hash is stored.
export async function createPasswordResetLink(db: PrismaClient, actor: Actor, userId: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return db.$transaction(async (tx) => {
    const member = await tx.membership.findFirst({
      where: { organizationId: actor.organizationId, userId },
      include: { user: { select: { email: true, isActive: true } } },
    });
    if (!member) throw new DomainError("המשתמש לא נמצא");
    if (!member.user.isActive) throw new DomainError("המשתמש מושבת. יש להפעיל אותו לפני איפוס סיסמה.");
    // A new link replaces any earlier unused link for the same person.
    await tx.passwordResetLink.updateMany({
      where: { userId, usedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    const link = await tx.passwordResetLink.create({
      data: {
        organizationId: actor.organizationId,
        userId,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(now.getTime() + RESET_LINK_TTL_HOURS * 60 * 60 * 1000),
        createdById: actor.userId,
      },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "user.password.reset_link",
      entityType: "User",
      entityId: userId,
    });
    return { link, token, email: member.user.email };
  });
}

// The person behind a link, or null when the link is unknown, used, revoked or expired.
export function findUsableResetLink(db: PrismaClient, token: string, now = new Date()) {
  return db.passwordResetLink.findFirst({
    where: { tokenHash: hashResetToken(token), usedAt: null, revokedAt: null, expiresAt: { gt: now }, user: { isActive: true } },
    select: { id: true, user: { select: { name: true, email: true } } },
  });
}

export async function redeemPasswordResetLink(db: PrismaClient, token: string, input: NewPasswordInput, now = new Date()) {
  const passwordHash = await hashPassword(input.password);
  return db.$transaction(async (tx) => {
    const link = await tx.passwordResetLink.findFirst({
      where: { tokenHash: hashResetToken(token), usedAt: null, revokedAt: null, expiresAt: { gt: now }, user: { isActive: true } },
      include: { user: { select: { email: true } } },
    });
    if (!link) throw new DomainError("הקישור אינו בתוקף. בקשו קישור חדש ממנהל המערכת.");
    // Claim the link first so it works only once.
    const claimed = await tx.passwordResetLink.updateMany({ where: { id: link.id, usedAt: null }, data: { usedAt: now } });
    if (claimed.count === 0) throw new DomainError("הקישור כבר נוצל");

    const updated = await tx.account.updateMany({ where: { userId: link.userId, providerId: "credential" }, data: { password: passwordHash } });
    if (updated.count === 0) {
      await tx.account.create({ data: { id: randomUUID(), accountId: link.userId, providerId: "credential", userId: link.userId, password: passwordHash } });
    }
    // Signs the person out everywhere so only the new password works.
    await tx.session.deleteMany({ where: { userId: link.userId } });
    await writeAudit(tx, {
      organizationId: link.organizationId,
      actorId: link.userId,
      action: "user.password.reset_by_link",
      entityType: "User",
      entityId: link.userId,
    });
    return { email: link.user.email };
  });
}
