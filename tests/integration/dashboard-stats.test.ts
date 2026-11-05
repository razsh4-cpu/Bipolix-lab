import { afterAll, describe, expect, it } from "vitest";
import { getDashboardStats } from "@/modules/dashboard/stats";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

const NOW = new Date("2026-10-25T10:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("getDashboardStats", () => {
  it("returns zeros for an empty organization", async () => {
    const { org } = await createOrgWithAdmin(db);
    const stats = await getDashboardStats(db, org.id, NOW);
    expect(stats.equipment).toMatchObject({ total: 0, operational: 0, down: 0, needsAttention: 0, critical: [] });
    expect(stats.inventory).toMatchObject({ total: 0, lowStockCount: 0, openOrders: null });
    expect(stats.maintenance).toEqual({ openFaults: 0, criticalFaults: 0, scheduled: 0, overdue: 0 });
    expect(stats.tasks).toEqual({ open: 0, overdue: 0, completed: 0 });
  });

  it("counts equipment, faults, plans, stock and tasks correctly", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const o = { organizationId: org.id };
    const ok = await db.equipment.create({ data: { ...o, name: "A", category: "CNC" } });
    const overduePlan = await db.equipment.create({ data: { ...o, name: "B", category: "CNC" } });
    const down = await db.equipment.create({ data: { ...o, name: "C", category: "Laser", status: "OUT_OF_SERVICE" } });
    await db.equipment.create({ data: { ...o, name: "D", category: "3D", status: "LIMITED_OPERATION" } });
    await db.equipment.create({ data: { ...o, name: "Archived", category: "X", archivedAt: NOW } });

    await db.faultReport.create({ data: { ...o, equipmentId: down.id, description: "x", severity: "CRITICAL", reportedById: user.id } });
    await db.faultReport.create({ data: { ...o, equipmentId: ok.id, description: "x", severity: "LOW", reportedById: user.id, status: "CLOSED" } });
    await db.maintenancePlan.create({ data: { ...o, equipmentId: overduePlan.id, title: "p", nextDueAt: day("2026-10-20"), source: "ADMIN" } });
    await db.maintenancePlan.create({ data: { ...o, equipmentId: ok.id, title: "p", nextDueAt: day("2026-11-20"), source: "MANUFACTURER" } });
    await db.maintenancePlan.create({ data: { ...o, equipmentId: ok.id, title: "inactive", nextDueAt: day("2026-01-01"), source: "ADMIN", isActive: false } });

    await db.inventoryItem.create({ data: { ...o, name: "Low", category: "Wood", unit: "pcs", quantity: 2, minStockLevel: 5 } });
    await db.inventoryItem.create({ data: { ...o, name: "Fine", category: "Wood", unit: "pcs", quantity: 9, minStockLevel: 5 } });
    await db.inventoryItem.create({ data: { ...o, name: "NoMin", category: "Wood", unit: "pcs", quantity: 0 } });

    await db.task.createMany({
      data: [
        { ...o, title: "open", createdById: user.id, dueDate: day("2026-10-30") },
        { ...o, title: "late", createdById: user.id, dueDate: day("2026-10-24") },
        { ...o, title: "done late", createdById: user.id, dueDate: day("2026-10-01"), status: "COMPLETED" },
      ],
    });

    const stats = await getDashboardStats(db, org.id, NOW);
    expect(stats.equipment.total).toBe(4);
    expect(stats.equipment.operational).toBe(2);
    expect(stats.equipment.down).toBe(1);
    // B (overdue plan) + D (limited); C is already counted as down.
    expect(stats.equipment.needsAttention).toBe(2);
    expect(stats.equipment.critical.map((e) => e.name)).toEqual(["C"]);
    expect(stats.inventory.total).toBe(3);
    expect(stats.inventory.lowStock.map((i) => i.name)).toEqual(["Low"]);
    expect(stats.maintenance).toEqual({ openFaults: 1, criticalFaults: 1, scheduled: 1, overdue: 1 });
    expect(stats.tasks).toEqual({ open: 2, overdue: 1, completed: 1 });
  });

  it("never counts another organization's data", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    await db.equipment.create({ data: { organizationId: a.org.id, name: "A only", category: "CNC" } });
    const stats = await getDashboardStats(db, b.org.id, NOW);
    expect(stats.equipment.total).toBe(0);
  });
});
