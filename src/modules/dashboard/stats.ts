import type { PrismaClient } from "@/generated/prisma/client";
import { startOfToday } from "@/lib/dates";

const OPEN_FAULT_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_PARTS"] as const;

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

export type LowStockItem = {
  id: string;
  name: string;
  quantity: string;
  minStockLevel: string;
  unit: string;
};

// All figures are computed from real records of a single organization.
export async function getDashboardStats(db: PrismaClient, organizationId: string, now = new Date()) {
  const today = startOfToday(now);
  const org = { organizationId };
  const activeEquipment = { ...org, archivedAt: null };
  const openFault = { status: { in: [...OPEN_FAULT_STATUSES] } };

  const [
    equipmentTotal,
    equipmentOperational,
    equipmentDown,
    equipmentNeedsAttention,
    criticalEquipment,
    inventoryTotal,
    lowStockItems,
    openFaults,
    criticalFaults,
    plansScheduled,
    plansOverdue,
    tasksOpen,
    tasksOverdue,
    tasksCompleted,
  ] = await Promise.all([
    db.equipment.count({ where: activeEquipment }),
    db.equipment.count({ where: { ...activeEquipment, status: "OPERATIONAL" } }),
    db.equipment.count({
      where: { ...activeEquipment, status: { in: ["UNDER_MAINTENANCE", "OUT_OF_SERVICE"] } },
    }),
    db.equipment.count({
      where: {
        ...activeEquipment,
        status: { in: ["OPERATIONAL", "LIMITED_OPERATION"] },
        OR: [
          { status: "LIMITED_OPERATION" },
          { faultReports: { some: openFault } },
          { plans: { some: { isActive: true, nextDueAt: { lt: today } } } },
        ],
      },
    }),
    db.equipment.findMany({
      where: { ...activeEquipment, faultReports: { some: { ...openFault, severity: "CRITICAL" } } },
      select: { id: true, name: true, status: true },
      orderBy: { name: "asc" },
      take: 5,
    }),
    db.inventoryItem.count({ where: { ...org, archivedAt: null } }),
    db.$queryRaw<LowStockItem[]>`
      SELECT "id", "name", "quantity"::text AS "quantity",
             "minStockLevel"::text AS "minStockLevel", "unit"
      FROM "InventoryItem"
      WHERE "organizationId" = ${organizationId}
        AND "archivedAt" IS NULL
        AND "minStockLevel" IS NOT NULL
        AND "quantity" < "minStockLevel"
      ORDER BY ("quantity" / NULLIF("minStockLevel", 0)) ASC, "name" ASC`,
    db.faultReport.count({ where: { ...org, ...openFault } }),
    db.faultReport.count({ where: { ...org, ...openFault, severity: "CRITICAL" } }),
    db.maintenancePlan.count({ where: { ...org, isActive: true, nextDueAt: { gte: today } } }),
    db.maintenancePlan.count({ where: { ...org, isActive: true, nextDueAt: { lt: today } } }),
    db.task.count({ where: { ...org, status: { not: "COMPLETED" } } }),
    db.task.count({ where: { ...org, status: { not: "COMPLETED" }, dueDate: { lt: today } } }),
    db.task.count({ where: { ...org, status: "COMPLETED" } }),
  ]);

  return {
    equipment: {
      total: equipmentTotal,
      operational: equipmentOperational,
      down: equipmentDown,
      needsAttention: equipmentNeedsAttention,
      critical: criticalEquipment,
    },
    inventory: {
      total: inventoryTotal,
      lowStockCount: lowStockItems.length,
      lowStock: lowStockItems.slice(0, 5),
      // Purchase orders module does not exist yet.
      openOrders: null,
    },
    maintenance: {
      openFaults,
      criticalFaults,
      scheduled: plansScheduled,
      overdue: plansOverdue,
    },
    tasks: { open: tasksOpen, overdue: tasksOverdue, completed: tasksCompleted },
  };
}
