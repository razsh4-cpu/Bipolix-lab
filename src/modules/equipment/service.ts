import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { EquipmentStatus } from "@/generated/prisma/enums";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import type { EquipmentInput, EquipmentStatusChange } from "./schema";

export const OPEN_FAULT_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS"] as const;

export type EquipmentFilters = { q?: string; status?: EquipmentStatus; category?: string };

export function listEquipment(db: PrismaClient, organizationId: string, filters: EquipmentFilters = {}) {
  const where: Prisma.EquipmentWhereInput = { organizationId, archivedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    where.OR = [{ name: contains }, { manufacturer: contains }, { model: contains }, { serialNumber: contains }, { location: contains }];
  }
  return db.equipment.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      manufacturer: true,
      model: true,
      location: true,
      status: true,
      _count: { select: { faultReports: { where: { status: { in: [...OPEN_FAULT_STATUSES] } } } } },
    },
  });
}

export async function listEquipmentCategories(db: PrismaClient, organizationId: string) {
  const rows = await db.equipment.findMany({
    where: { organizationId, archivedAt: null },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}

export function getEquipment(db: PrismaClient, organizationId: string, id: string) {
  return db.equipment.findFirst({
    where: { id, organizationId },
    include: {
      lab: { select: { name: true } },
      faultReports: {
        orderBy: { reportedAt: "desc" },
        take: 20,
        include: { reportedBy: { select: { name: true } } },
      },
      maintenance: {
        orderBy: { performedAt: "desc" },
        take: 20,
        include: { performedBy: { select: { name: true } } },
      },
      plans: { where: { isActive: true }, orderBy: { nextDueAt: "asc" } },
      tasks: {
        where: { status: { not: "COMPLETED" } },
        orderBy: { dueDate: "asc" },
        include: { assignee: { select: { name: true } } },
      },
    },
  });
}

async function assertLabInOrg(tx: Prisma.TransactionClient, organizationId: string, labId?: string) {
  if (!labId) return;
  const lab = await tx.lab.findFirst({ where: { id: labId, organizationId }, select: { id: true } });
  if (!lab) throw new DomainError("המעבדה שנבחרה לא קיימת");
}

export function createEquipment(db: PrismaClient, actor: Actor, input: EquipmentInput) {
  return db.$transaction(async (tx) => {
    await assertLabInOrg(tx, actor.organizationId, input.labId);
    const equipment = await tx.equipment.create({ data: { ...input, organizationId: actor.organizationId } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "equipment.create",
      entityType: "Equipment",
      entityId: equipment.id,
      details: { name: equipment.name },
    });
    return equipment;
  });
}

export function updateEquipment(db: PrismaClient, actor: Actor, id: string, input: EquipmentInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.equipment.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("הציוד לא נמצא");
    await assertLabInOrg(tx, actor.organizationId, input.labId);
    // Unset optional fields explicitly so clearing a field in the form clears it in the DB.
    const data = {
      labId: null,
      manufacturer: null,
      model: null,
      serialNumber: null,
      location: null,
      purchaseDate: null,
      warrantyExpiresAt: null,
      notes: null,
      safetyInstructions: null,
      ...input,
    };
    const equipment = await tx.equipment.update({ where: { id }, data });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "equipment.update",
      entityType: "Equipment",
      entityId: id,
    });
    return equipment;
  });
}

export function changeEquipmentStatus(db: PrismaClient, actor: Actor, id: string, change: EquipmentStatusChange) {
  return db.$transaction(async (tx) => {
    const existing = await tx.equipment.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("הציוד לא נמצא");
    if (existing.status === change.status) return existing;
    const equipment = await tx.equipment.update({ where: { id }, data: { status: change.status } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "equipment.status",
      entityType: "Equipment",
      entityId: id,
      details: { from: existing.status, to: change.status, reason: change.reason ?? null },
    });
    return equipment;
  });
}

export function archiveEquipment(db: PrismaClient, actor: Actor, id: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.equipment.findFirst({ where: { id, organizationId: actor.organizationId, archivedAt: null } });
    if (!existing) throw new DomainError("הציוד לא נמצא");
    await tx.equipment.update({ where: { id }, data: { archivedAt: new Date() } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "equipment.archive",
      entityType: "Equipment",
      entityId: id,
    });
  });
}

export function listLabs(db: PrismaClient, organizationId: string) {
  return db.lab.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}
