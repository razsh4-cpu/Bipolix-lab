import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { startOfToday } from "@/lib/dates";
import { OPEN_FAULT_STATUSES } from "@/modules/equipment/service";
import { DomainError, type Actor } from "@/modules/types";
import type { FaultReportInput, FaultStatusInput, MaintenancePlanInput, MaintenanceRecordInput } from "./schema";

// A critical fault takes the machine out of service until an authorised person
// checks it. Closing the fault later does NOT return the machine to service.
export function reportFault(db: PrismaClient, actor: Actor, input: FaultReportInput) {
  return db.$transaction(async (tx) => {
    const equipment = await tx.equipment.findFirst({
      where: { id: input.equipmentId, organizationId: actor.organizationId, archivedAt: null },
    });
    if (!equipment) throw new DomainError("הציוד לא נמצא");

    const fault = await tx.faultReport.create({
      data: { ...input, organizationId: actor.organizationId, reportedById: actor.userId },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "fault.report",
      entityType: "FaultReport",
      entityId: fault.id,
      details: { equipmentId: equipment.id, severity: input.severity },
    });

    if (input.severity === "CRITICAL" && equipment.status !== "OUT_OF_SERVICE") {
      await tx.equipment.update({ where: { id: equipment.id }, data: { status: "OUT_OF_SERVICE" } });
      await writeAudit(tx, {
        organizationId: actor.organizationId,
        actorId: actor.userId,
        action: "equipment.status",
        entityType: "Equipment",
        entityId: equipment.id,
        details: { from: equipment.status, to: "OUT_OF_SERVICE", reason: "critical fault reported", faultReportId: fault.id },
      });
    }
    return fault;
  });
}

export function updateFaultStatus(db: PrismaClient, actor: Actor, id: string, input: FaultStatusInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.faultReport.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("התקלה לא נמצאה");
    if (existing.status === input.status) return existing;
    const isDone = input.status === "RESOLVED" || input.status === "CLOSED";
    const fault = await tx.faultReport.update({
      where: { id },
      data: { status: input.status, resolvedAt: isDone ? (existing.resolvedAt ?? new Date()) : null },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "fault.status",
      entityType: "FaultReport",
      entityId: id,
      details: { from: existing.status, to: input.status },
    });
    return fault;
  });
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function recordMaintenance(db: PrismaClient, actor: Actor, input: MaintenanceRecordInput) {
  const { planId, ...data } = input;
  return db.$transaction(async (tx) => {
    const org = actor.organizationId;
    const equipment = await tx.equipment.findFirst({ where: { id: data.equipmentId, organizationId: org } });
    if (!equipment) throw new DomainError("הציוד לא נמצא");
    if (data.faultReportId) {
      const fault = await tx.faultReport.findFirst({ where: { id: data.faultReportId, organizationId: org, equipmentId: equipment.id } });
      if (!fault) throw new DomainError("התקלה לא שייכת לציוד הזה");
    }
    const record = await tx.maintenanceRecord.create({ data: { ...data, organizationId: org, performedById: actor.userId } });

    // Completing a planned treatment moves the plan forward by its interval.
    if (planId) {
      const plan = await tx.maintenancePlan.findFirst({ where: { id: planId, organizationId: org, equipmentId: equipment.id, isActive: true } });
      if (!plan) throw new DomainError("תוכנית התחזוקה לא נמצאה");
      if (plan.intervalDays) {
        await tx.maintenancePlan.update({ where: { id: plan.id }, data: { nextDueAt: addDays(data.performedAt, plan.intervalDays) } });
      } else {
        await tx.maintenancePlan.update({ where: { id: plan.id }, data: { isActive: false } });
      }
    }
    await writeAudit(tx, {
      organizationId: org,
      actorId: actor.userId,
      action: "maintenance.record",
      entityType: "MaintenanceRecord",
      entityId: record.id,
      details: { equipmentId: equipment.id, planId: planId ?? null, faultReportId: data.faultReportId ?? null },
    });
    return record;
  });
}

export function createMaintenancePlan(db: PrismaClient, actor: Actor, input: MaintenancePlanInput) {
  return db.$transaction(async (tx) => {
    const equipment = await tx.equipment.findFirst({ where: { id: input.equipmentId, organizationId: actor.organizationId, archivedAt: null } });
    if (!equipment) throw new DomainError("הציוד לא נמצא");
    const plan = await tx.maintenancePlan.create({ data: { ...input, organizationId: actor.organizationId } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "maintenance.plan.create",
      entityType: "MaintenancePlan",
      entityId: plan.id,
      details: { source: input.source, intervalDays: input.intervalDays ?? null },
    });
    return plan;
  });
}

export function deactivateMaintenancePlan(db: PrismaClient, actor: Actor, id: string) {
  return db.$transaction(async (tx) => {
    const plan = await tx.maintenancePlan.findFirst({ where: { id, organizationId: actor.organizationId, isActive: true } });
    if (!plan) throw new DomainError("התוכנית לא נמצאה");
    await tx.maintenancePlan.update({ where: { id }, data: { isActive: false } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "maintenance.plan.deactivate",
      entityType: "MaintenancePlan",
      entityId: id,
    });
  });
}

export type FaultFilter = "open" | "all";

export async function getMaintenanceOverview(db: PrismaClient, organizationId: string, faultFilter: FaultFilter, now = new Date()) {
  const today = startOfToday(now);
  const [faults, plans, records] = await Promise.all([
    db.faultReport.findMany({
      where: { organizationId, ...(faultFilter === "open" ? { status: { in: [...OPEN_FAULT_STATUSES] } } : {}) },
      orderBy: [{ reportedAt: "desc" }],
      take: 100,
      include: { equipment: { select: { id: true, name: true } }, reportedBy: { select: { name: true } } },
    }),
    db.maintenancePlan.findMany({
      where: { organizationId, isActive: true },
      orderBy: { nextDueAt: "asc" },
      include: { equipment: { select: { id: true, name: true } } },
    }),
    db.maintenanceRecord.findMany({
      where: { organizationId },
      orderBy: { performedAt: "desc" },
      take: 20,
      include: { equipment: { select: { id: true, name: true } }, performedBy: { select: { name: true } } },
    }),
  ]);
  const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  faults.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  return { faults, plans: plans.map((p) => ({ ...p, isOverdue: p.nextDueAt < today })), records };
}

export function getFault(db: PrismaClient, organizationId: string, id: string) {
  return db.faultReport.findFirst({
    where: { id, organizationId },
    include: {
      equipment: { select: { id: true, name: true, status: true } },
      reportedBy: { select: { name: true } },
      maintenance: { orderBy: { performedAt: "desc" }, include: { performedBy: { select: { name: true } } } },
    },
  });
}

export function equipmentOptions(db: PrismaClient, organizationId: string) {
  return db.equipment.findMany({
    where: { organizationId, archivedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
