import type { PrismaClient } from "@/generated/prisma/client";
import type { DevelopmentStatus } from "@/generated/prisma/enums";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import type { DevelopmentInput } from "./schema";

// Work in motion first, finished work last.
export const DEVELOPMENT_STATUS_ORDER: DevelopmentStatus[] = ["IN_PROGRESS", "TESTING", "IDEA", "ON_HOLD", "DONE"];

export function listDevelopments(db: PrismaClient, organizationId: string) {
  return db.development.findMany({
    where: { organizationId },
    orderBy: [{ targetDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true, title: true, description: true, status: true, owner: true, targetDate: true, updatedAt: true },
  });
}

export function getDevelopment(db: PrismaClient, organizationId: string, id: string) {
  return db.development.findFirst({ where: { id, organizationId } });
}

export function createDevelopment(db: PrismaClient, actor: Actor, input: DevelopmentInput) {
  return db.$transaction(async (tx) => {
    const development = await tx.development.create({
      data: { ...input, organizationId: actor.organizationId, createdById: actor.userId },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "development.create",
      entityType: "Development",
      entityId: development.id,
    });
    return development;
  });
}

export function updateDevelopment(db: PrismaClient, actor: Actor, id: string, input: DevelopmentInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.development.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("הפיתוח לא נמצא");
    // Clearing a field in the form clears it in the DB.
    await tx.development.update({ where: { id }, data: { description: null, owner: null, targetDate: null, ...input } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "development.update",
      entityType: "Development",
      entityId: id,
      details: existing.status === input.status ? undefined : { from: existing.status, to: input.status },
    });
  });
}
