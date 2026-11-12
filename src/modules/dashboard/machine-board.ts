import type { PrismaClient } from "@/generated/prisma/client";
import type { EquipmentStatus, FaultSeverity, FaultStatus } from "@/generated/prisma/enums";
import { startOfToday } from "@/lib/dates";
import { OPEN_FAULT_STATUSES } from "@/modules/equipment/service";

export type Condition = "ok" | "attention" | "down";

type BoardFault = {
  id: string;
  description: string;
  severity: FaultSeverity;
  status: FaultStatus;
  handledBy: string | null;
  expectedFixAt: Date | null;
};
type BoardMachine = {
  status: EquipmentStatus;
  faultReports: BoardFault[];
  plans: { title: string; nextDueAt: Date }[];
  lowStock?: unknown[];
};

const SEVERITY_RANK: Record<FaultSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// Machine is "down" when it is not usable at all, "attention" when usable but
// something is open (fault, overdue maintenance, low stock).
export function machineCondition(m: BoardMachine, today: Date): Condition {
  if (m.status === "OUT_OF_SERVICE" || m.status === "UNDER_MAINTENANCE") return "down";
  if (m.faultReports.some((f) => f.severity === "CRITICAL")) return "down";
  if (m.faultReports.length > 0) return "attention";
  if (m.plans.some((p) => p.nextDueAt < today)) return "attention";
  if (m.lowStock && m.lowStock.length > 0) return "attention";
  return "ok";
}

const CONDITION_ORDER: Record<Condition, number> = { down: 0, attention: 1, ok: 2 };

export async function getMachineBoard(db: PrismaClient, organizationId: string, now = new Date()) {
  const today = startOfToday(now);
  const machines = await db.equipment.findMany({
    // Ordered or still-to-buy equipment is not in the lab yet, so it is not on the board.
    where: { organizationId, archivedAt: null, procurement: "IN_SERVICE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      faultReports: {
        where: { status: { in: [...OPEN_FAULT_STATUSES] } },
        orderBy: { reportedAt: "desc" },
        select: { id: true, description: true, severity: true, status: true, handledBy: true, expectedFixAt: true },
      },
      plans: {
        where: { isActive: true, nextDueAt: { lt: today } },
        orderBy: { nextDueAt: "asc" },
        select: { title: true, nextDueAt: true },
      },
      loaded: {
        where: { item: { archivedAt: null } },
        orderBy: { slot: "asc" },
        select: { id: true, slot: true, item: { select: { id: true, name: true, color: true } } },
      },
      inventoryItems: {
        where: { item: { archivedAt: null, minStockLevel: { not: null } } },
        select: { item: { select: { id: true, name: true, unit: true, quantity: true, minStockLevel: true } } },
      },
    },
  });

  return machines
    .map(({ inventoryItems, ...m }) => {
      const lowStock = inventoryItems
        .map((l) => l.item)
        .filter((i) => i.minStockLevel !== null && i.quantity.lessThan(i.minStockLevel))
        .map((i) => ({ id: i.id, name: i.name, unit: i.unit, quantity: i.quantity.toString() }));
      const row = {
        ...m,
        faultReports: [...m.faultReports].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
        lowStock,
      };
      return { ...row, condition: machineCondition(row, today) };
    })
    .sort((a, b) => CONDITION_ORDER[a.condition] - CONDITION_ORDER[b.condition]);
}

export type MachineBoardRow = Awaited<ReturnType<typeof getMachineBoard>>[number];
