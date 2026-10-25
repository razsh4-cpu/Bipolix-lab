import { afterAll, describe, expect, it } from "vitest";
import { createEquipment } from "@/modules/equipment/service";
import { MaintenancePlanInput } from "@/modules/maintenance/schema";
import { createMaintenancePlan, recordMaintenance, reportFault, updateFaultStatus } from "@/modules/maintenance/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

async function setup() {
  const { org, user } = await createOrgWithAdmin(db);
  const actor = { organizationId: org.id, userId: user.id };
  const equipment = await createEquipment(db, actor, { name: "Laser", category: "Laser" });
  return { org, actor, equipment };
}
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("maintenance", () => {
  it("takes equipment out of service on a critical fault", async () => {
    const { actor, equipment } = await setup();
    await reportFault(db, actor, { equipmentId: equipment.id, severity: "CRITICAL", description: "smoke" });
    const e = await db.equipment.findUniqueOrThrow({ where: { id: equipment.id } });
    expect(e.status).toBe("OUT_OF_SERVICE");
  });

  it("leaves equipment status alone for a non-critical fault", async () => {
    const { actor, equipment } = await setup();
    await reportFault(db, actor, { equipmentId: equipment.id, severity: "HIGH", description: "noise" });
    expect((await db.equipment.findUniqueOrThrow({ where: { id: equipment.id } })).status).toBe("OPERATIONAL");
  });

  it("does not return equipment to service when the fault is closed", async () => {
    const { actor, equipment } = await setup();
    const fault = await reportFault(db, actor, { equipmentId: equipment.id, severity: "CRITICAL", description: "smoke" });
    const closed = await updateFaultStatus(db, actor, fault.id, { status: "CLOSED" });
    expect(closed.resolvedAt).not.toBeNull();
    expect((await db.equipment.findUniqueOrThrow({ where: { id: equipment.id } })).status).toBe("OUT_OF_SERVICE");
  });

  it("advances a plan by its interval when maintenance is recorded against it", async () => {
    const { actor, equipment } = await setup();
    const plan = await createMaintenancePlan(db, actor, {
      equipmentId: equipment.id, title: "Lens cleaning", nextDueAt: day("2026-10-01"), intervalDays: 30, source: "ADMIN",
    });
    await recordMaintenance(db, actor, {
      equipmentId: equipment.id, planId: plan.id, type: "PREVENTIVE", description: "cleaned", performedAt: day("2026-10-20"),
    });
    const fresh = await db.maintenancePlan.findUniqueOrThrow({ where: { id: plan.id } });
    expect(fresh.nextDueAt.toISOString().slice(0, 10)).toBe("2026-11-19");
  });

  it("requires a source for every maintenance plan", () => {
    expect(MaintenancePlanInput.safeParse({ equipmentId: "x", title: "t", nextDueAt: "2026-11-01" }).success).toBe(false);
  });

  it("rejects linking a fault from different equipment or organization", async () => {
    const { actor, equipment } = await setup();
    const other = await setup();
    const fault = await reportFault(db, other.actor, { equipmentId: other.equipment.id, severity: "LOW", description: "x" });
    await expect(
      recordMaintenance(db, actor, { equipmentId: equipment.id, faultReportId: fault.id, type: "CORRECTIVE", description: "x", performedAt: day("2026-10-20") }),
    ).rejects.toThrow("התקלה לא שייכת לציוד הזה");
    await expect(reportFault(db, actor, { equipmentId: other.equipment.id, severity: "LOW", description: "x" })).rejects.toThrow("הציוד לא נמצא");
  });
});
