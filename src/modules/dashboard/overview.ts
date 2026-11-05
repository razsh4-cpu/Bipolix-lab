import type { PrismaClient } from "@/generated/prisma/client";
import { startOfToday } from "@/lib/dates";
import { getTruckSchedule, unconfirmedPastActivities } from "@/modules/activities/service";
import { getMachineBoard, type MachineBoardRow } from "./machine-board";

export type AlertLevel = "critical" | "warning" | "info";
export type DashboardAlert = { level: AlertLevel; text: string; href: string };

export type MaterialRow = { id: string; name: string; unit: string; quantity: string; state: "out" | "low" | "ok" };

const LEVEL_ORDER: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };

function fmt(date: Date) {
  return date.toISOString().slice(0, 10).split("-").reverse().join(".");
}

// Builds the alert list from the same records the rest of the dashboard shows.
export function buildAlerts(
  machines: MachineBoardRow[],
  materials: Map<string, MaterialRow[]>,
  unconfirmed: { id: string; title: string; date: Date }[],
  today: Date,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  for (const m of machines) {
    for (const f of m.faultReports) {
      const href = `/maintenance/faults/${f.id}`;
      if (f.severity === "CRITICAL") alerts.push({ level: "critical", text: `${m.name}: תקלה קריטית פתוחה`, href });
      if (f.expectedFixAt && f.expectedFixAt < today) {
        alerts.push({ level: "critical", text: `${m.name}: עבר תאריך היעד לתיקון (${fmt(f.expectedFixAt)})`, href });
      } else if (!f.handledBy) {
        alerts.push({ level: "warning", text: `${m.name}: לא הוגדר מי מטפל בתקלה`, href });
      }
    }
    for (const p of m.plans) {
      alerts.push({ level: "warning", text: `${m.name}: טיפול באיחור (${p.title})`, href: `/equipment/${m.id}` });
    }
  }
  for (const rows of materials.values()) {
    for (const r of rows) {
      if (r.state === "out") alerts.push({ level: "critical", text: `נגמר: ${r.name}`, href: `/inventory/${r.id}` });
      else if (r.state === "low") alerts.push({ level: "warning", text: `מלאי נמוך: ${r.name} (${Number(r.quantity)} ${r.unit})`, href: `/inventory/${r.id}` });
    }
  }
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
    select: { id: true, name: true, unit: true, category: true, quantity: true, minStockLevel: true },
  });
  const groups = new Map<string, MaterialRow[]>();
  for (const i of items) {
    const state = i.quantity.isZero() ? "out" : i.minStockLevel !== null && i.quantity.lessThan(i.minStockLevel) ? "low" : "ok";
    const row: MaterialRow = { id: i.id, name: i.name, unit: i.unit, quantity: i.quantity.toString(), state };
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
