import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import type { ProcedureInput } from "./schema";

async function assertEquipment(tx: Prisma.TransactionClient, organizationId: string, equipmentId?: string) {
  if (!equipmentId) return;
  const e = await tx.equipment.findFirst({ where: { id: equipmentId, organizationId, archivedAt: null } });
  if (!e) throw new DomainError("הציוד לא נמצא");
}

// Every save keeps a full copy in ProcedureRevision so earlier versions stay readable.
export function createProcedure(db: PrismaClient, actor: Actor, input: ProcedureInput) {
  return db.$transaction(async (tx) => {
    await assertEquipment(tx, actor.organizationId, input.equipmentId);
    const procedure = await tx.procedure.create({
      data: { ...input, equipmentId: input.equipmentId ?? null, organizationId: actor.organizationId },
    });
    await tx.procedureRevision.create({
      data: {
        organizationId: actor.organizationId,
        procedureId: procedure.id,
        version: 1,
        title: input.title,
        body: input.body,
        source: input.source,
        editedById: actor.userId,
      },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "procedure.create",
      entityType: "Procedure",
      entityId: procedure.id,
      details: { kind: input.kind, equipmentId: input.equipmentId ?? null },
    });
    return procedure;
  });
}

export function updateProcedure(db: PrismaClient, actor: Actor, id: string, input: ProcedureInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.procedure.findFirst({ where: { id, organizationId: actor.organizationId, archivedAt: null } });
    if (!existing) throw new DomainError("הנוהל לא נמצא");
    await assertEquipment(tx, actor.organizationId, input.equipmentId);
    const contentChanged = existing.title !== input.title || existing.body !== input.body || existing.source !== input.source;
    const version = contentChanged ? existing.version + 1 : existing.version;
    const procedure = await tx.procedure.update({
      where: { id },
      data: { ...input, equipmentId: input.equipmentId ?? null, version },
    });
    if (contentChanged) {
      await tx.procedureRevision.create({
        data: {
          organizationId: actor.organizationId,
          procedureId: id,
          version,
          title: input.title,
          body: input.body,
          source: input.source,
          editedById: actor.userId,
        },
      });
    }
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "procedure.update",
      entityType: "Procedure",
      entityId: id,
      details: { version },
    });
    return procedure;
  });
}

export function archiveProcedure(db: PrismaClient, actor: Actor, id: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.procedure.findFirst({ where: { id, organizationId: actor.organizationId, archivedAt: null } });
    if (!existing) throw new DomainError("הנוהל לא נמצא");
    await tx.procedure.update({ where: { id }, data: { archivedAt: new Date() } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "procedure.archive",
      entityType: "Procedure",
      entityId: id,
    });
  });
}

export function listProcedures(db: PrismaClient, organizationId: string, filter: { equipmentId?: string } = {}) {
  return db.procedure.findMany({
    where: { organizationId, archivedAt: null, ...(filter.equipmentId ? { equipmentId: filter.equipmentId } : {}) },
    orderBy: [{ kind: "asc" }, { title: "asc" }],
    include: { equipment: { select: { id: true, name: true } } },
  });
}

export function getProcedure(db: PrismaClient, organizationId: string, id: string) {
  return db.procedure.findFirst({
    where: { id, organizationId, archivedAt: null },
    include: {
      equipment: { select: { id: true, name: true } },
      revisions: { orderBy: { version: "desc" }, include: { editedBy: { select: { name: true } } } },
    },
  });
}
