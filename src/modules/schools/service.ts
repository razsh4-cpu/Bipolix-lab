import type { PrismaClient } from "@/generated/prisma/client";
import type { PrintRequestStatus } from "@/generated/prisma/enums";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import type { PrintRequestInput, SchoolInput } from "./schema";

// Work still to do first; delivered requests last.
export const PRINT_REQUEST_STATUS_ORDER: PrintRequestStatus[] = ["PENDING", "PRINTING", "PRINTED", "DELIVERED"];

export function listSchoolsWithRequests(db: PrismaClient, organizationId: string) {
  return db.school.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      printRequests: {
        orderBy: { createdAt: "asc" },
        select: { id: true, description: true, quantity: true, filesUrl: true, status: true, createdAt: true, updatedAt: true },
      },
    },
  });
}

export function listSchools(db: PrismaClient, organizationId: string) {
  return db.school.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
}

export function getSchool(db: PrismaClient, organizationId: string, id: string) {
  return db.school.findFirst({ where: { id, organizationId } });
}

export function getPrintRequest(db: PrismaClient, organizationId: string, id: string) {
  return db.printRequest.findFirst({ where: { id, organizationId } });
}

async function assertUniqueName(db: Pick<PrismaClient, "school">, organizationId: string, name: string, exceptId?: string) {
  const clash = await db.school.findFirst({ where: { organizationId, name, NOT: exceptId ? { id: exceptId } : undefined } });
  if (clash) throw new DomainError("כבר קיים בית ספר בשם הזה");
}

export function createSchool(db: PrismaClient, actor: Actor, input: SchoolInput) {
  return db.$transaction(async (tx) => {
    await assertUniqueName(tx, actor.organizationId, input.name);
    const school = await tx.school.create({ data: { name: input.name, organizationId: actor.organizationId } });
    await writeAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, action: "school.create", entityType: "School", entityId: school.id });
    return school;
  });
}

export function renameSchool(db: PrismaClient, actor: Actor, id: string, input: SchoolInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.school.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("בית הספר לא נמצא");
    await assertUniqueName(tx, actor.organizationId, input.name, id);
    await tx.school.update({ where: { id }, data: { name: input.name } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "school.update",
      entityType: "School",
      entityId: id,
      details: { from: existing.name, to: input.name },
    });
  });
}

async function assertSchool(db: Pick<PrismaClient, "school">, organizationId: string, schoolId: string) {
  const school = await db.school.findFirst({ where: { id: schoolId, organizationId } });
  if (!school) throw new DomainError("בית הספר לא נמצא");
}

export function createPrintRequest(db: PrismaClient, actor: Actor, input: PrintRequestInput) {
  return db.$transaction(async (tx) => {
    await assertSchool(tx, actor.organizationId, input.schoolId);
    const request = await tx.printRequest.create({
      data: { ...input, organizationId: actor.organizationId, createdById: actor.userId },
    });
    await writeAudit(tx, { organizationId: actor.organizationId, actorId: actor.userId, action: "printRequest.create", entityType: "PrintRequest", entityId: request.id });
    return request;
  });
}

export function updatePrintRequest(db: PrismaClient, actor: Actor, id: string, input: PrintRequestInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.printRequest.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("הבקשה לא נמצאה");
    await assertSchool(tx, actor.organizationId, input.schoolId);
    // Clearing a field in the form clears it in the DB.
    await tx.printRequest.update({ where: { id }, data: { quantity: null, filesUrl: null, ...input } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "printRequest.update",
      entityType: "PrintRequest",
      entityId: id,
      details: existing.status === input.status ? undefined : { from: existing.status, to: input.status },
    });
  });
}

export function setPrintRequestStatus(db: PrismaClient, actor: Actor, id: string, status: PrintRequestStatus) {
  return db.$transaction(async (tx) => {
    const existing = await tx.printRequest.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("הבקשה לא נמצאה");
    if (existing.status === status) return;
    await tx.printRequest.update({ where: { id }, data: { status } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "printRequest.update",
      entityType: "PrintRequest",
      entityId: id,
      details: { from: existing.status, to: status },
    });
  });
}
