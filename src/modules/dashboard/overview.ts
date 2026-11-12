import type { PrismaClient } from "@/generated/prisma/client";
import { startOfToday } from "@/lib/dates";
import { getTruckSchedule, unconfirmedPastActivities } from "@/modules/activities/service";
import { getMachineBoard, type MachineBoardRow } from "./machine-board";

export type AlertLevel = "critical" | "warning" | "info";
export type DashboardAlert = { level: AlertLevel; text: string; href: string };

export type MaterialRow = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  unit: string;
  quantity: string;
  state: "out" | "low" | "ok";
  // Machines (and slot) this material is loaded in right now.
  loadedIn: string[];
};

const LEVEL_ORDER: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };

function fmt(date: Date) {
  return date.toISOString().slice(0, 10).split("-").reverse().join(".");
}

const qty = (r: MaterialRow) => `${r.name} (${Number(r.quantity)} ${r.unit})`;

// Builds the alert list from the same records the rest of the dashboard shows.
// One line per machine and one line per stock state, so the list stays a short
// "what needs doing" index instead of repeating the cards below it.
export function buildAlerts(
  machines: MachineBoardRow[],
  materials: Map<string, MaterialRow[]>,
  unconfirmed: { id: string; title: string; date: Date }[],
  today: Date,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  for (const m of machines) {
    const reasons: string[] = [];
    let level: AlertLevel | null = null;
    const raise = (l: AlertLevel, text: string) => {
      if (!reasons.includes(text)) reasons.push(text);
      if (level === null || LEVEL_ORDER[l] < LEVEL_ORDER[level]) level = l;
    };
    for (const f of m.faultReports) {
      if (f.severity === "CRITICAL") raise("critical", "תקלה קריטית פתוחה");
      if (f.expectedFixAt && f.expectedFixAt < today) raise("critical", `עבר תאריך היעד לתיקון (${fmt(f.expectedFixAt)})`);
      else if (!f.handledBy) raise("warning", "לא הוגדר מי מטפל בתקלה");
    }
    for (const p of m.plans) raise("warning", `טיפול באיחור (${p.title})`);
    if (level !== null) {
      const href = m.faultReports.length === 1 ? `/maintenance/faults/${m.faultReports[0].id}` : `/equipment/${m.id}`;
      alerts.push({ level, text: `${m.name}: ${reasons.join(", ")}`, href });
    }
  }
  const rows = [...materials.values()].flat();
  const out = rows.filter((r) => r.state === "out");
  const low = rows.filter((r) => r.state === "low");
  const stockHref = (list: MaterialRow[]) => (list.length === 1 ? `/inventory/${list[0].id}` : "/dashboard#materials");
  if (out.length > 0) alerts.push({ level: "critical", text: `נגמר: ${out.map((r) => r.name).join(", ")}`, href: stockHref(out) });
  if (low.length > 0) alerts.push({ level: "warning", text: `מלאי נמוך: ${low.map(qty).join(", ")}`, href: stockHref(low) });
  for (const a of unconfirmed) {
    alerts.push({ level: "info", text: `לעדכן אם הפעילות בוצעה: ${a.title} (${fmt(a.date)})`, href: `/schedule/${a.id}/edit` });
  }
  return alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

// Material readiness: every inventory item grouped by category. An item with a
// minimum level is "low" below it; any item at zero is "out".
export async function getMaterials(db: PrismaClient, organizationId: string) {
  const items = await db.inventoryItem.findMany({
    where: { organizationId, archivedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      unit: true,
      category: true,
      color: true,
      quantity: true,
      minStockLevel: true,
      loadedIn: {
        where: { equipment: { archivedAt: null } },
        orderBy: { slot: "asc" },
        select: { slot: true, equipment: { select: { name: true } } },
      },
    },
  });
  const groups = new Map<string, MaterialRow[]>();
  for (const i of items) {
    const state = i.quantity.isZero() ? "out" : i.minStockLevel !== null && i.quantity.lessThan(i.minStockLevel) ? "low" : "ok";
    const row: MaterialRow = {
      id: i.id,
      name: i.name,
      category: i.category,
      color: i.color,
      unit: i.unit,
      quantity: i.quantity.toString(),
      state,
      loadedIn: i.loadedIn.map((l) => (l.slot ? `${l.equipment.name} (${l.slot})` : l.equipment.name)),
    };
    groups.set(i.category, [...(groups.get(i.category) ?? []), row]);
  }
  return groups;
}

export async function getOverview(db: PrismaClient, organizationId: string, now = new Date()) {
  const today = startOfToday(now);
  const [machines, materials, schedule, unconfirmed] = await Promise.all([
    getMachineBoard(db, organizationId, now),
    getMaterials(db, organizationId),
    getTruckSchedule(db, organizationId, now),
    unconfirmedPastActivities(db, organizationId, now),
  ]);
  return { machines, materials, schedule, alerts: buildAlerts(machines, materials, unconfirmed, today) };
}
