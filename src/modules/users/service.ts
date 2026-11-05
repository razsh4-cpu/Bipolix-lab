import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import type { MemberUpdateInput, NewMemberInput } from "./schema";

export function listMembers(db: PrismaClient, organizationId: string) {
  return db.membership.findMany({
    where: { organizationId },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    select: { role: true, createdAt: true, user: { select: { id: true, name: true, email: true, isActive: true } } },
  });
}

export function getMember(db: PrismaClient, organizationId: string, userId: string) {
  return db.membership.findFirst({
    where: { organizationId, userId },
    select: { role: true, createdAt: true, user: { select: { id: true, name: true, email: true, isActive: true } } },
  });
}

// The admin hands the first password to the person directly; nothing is emailed.
export async function addMember(db: PrismaClient, actor: Actor, input: NewMemberInput) {
  const email = input.email.toLowerCase();
  const passwordHash = await hashPassword(input.password);
  return db.$transaction(async (tx) => {
    if (await tx.user.findUnique({ where: { email } })) throw new DomainError("כבר קיים משתמש עם המייל הזה");
    const userId = randomUUID();
    await tx.user.create({ data: { id: userId, name: input.name, email, emailVerified: true } });
    await tx.account.create({ data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: passwordHash } });
    await tx.membership.create({ data: { userId, organizationId: actor.organizationId, role: input.role } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "user.create",
      entityType: "User",
      entityId: userId,
      details: { role: input.role },
    });
    return userId;
  });
}

async function activeAdminCount(tx: Prisma.TransactionClient, organizationId: string) {
  return tx.membership.count({ where: { organizationId, role: "ADMIN", user: { isActive: true } } });
}

export function updateMember(db: PrismaClient, actor: Actor, userId: string, input: MemberUpdateInput) {
  return db.$transaction(async (tx) => {
    const member = await tx.membership.findFirst({
      where: { organizationId: actor.organizationId, userId },
      include: { user: { select: { isActive: true } } },
    });
    if (!member) throw new DomainError("המשתמש לא נמצא");
    if (userId === actor.userId && (input.role !== member.role || !input.isActive)) {
      throw new DomainError("אי אפשר לשנות את התפקיד או להשבית את המשתמש שלך");
    }
    await tx.membership.update({ where: { id: member.id }, data: { role: input.role } });
    await tx.user.update({ where: { id: userId }, data: { isActive: input.isActive } });
    // Keep at least one active admin, so the organization can't be locked out.
    if ((await activeAdminCount(tx, actor.organizationId)) === 0) throw new DomainError("חייב להישאר לפחות מנהל פעיל אחד");
    if (!input.isActive) await tx.session.deleteMany({ where: { userId } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "user.update",
      entityType: "User",
      entityId: userId,
      details: { role: { from: member.role, to: input.role }, isActive: { from: member.user.isActive, to: input.isActive } },
    });
  });
}

export async function resetPassword(db: PrismaClient, actor: Actor, userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const member = await tx.membership.findFirst({ where: { organizationId: actor.organizationId, userId } });
    if (!member) throw new DomainError("המשתמש לא נמצא");
    const updated = await tx.account.updateMany({ where: { userId, providerId: "credential" }, data: { password: passwordHash } });
    if (updated.count === 0) throw new DomainError("למשתמש אין סיסמה במערכת");
    // Signs the person out everywhere so only the new password works.
    await tx.session.deleteMany({ where: { userId } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "user.password.reset",
      entityType: "User",
      entityId: userId,
    });
  });
}
