import { afterAll, describe, expect, it } from "vitest";
import { ActivityInput } from "@/modules/activities/schema";
import { createActivity, getTruckSchedule, updateActivity } from "@/modules/activities/service";
import { getOverview } from "@/modules/dashboard/overview";
import { createEquipment } from "@/modules/equipment/service";
import { createInventoryItem } from "@/modules/inventory/service";
import { reportFault, updateFault } from "@/modules/maintenance/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const NOW = new Date("2026-11-05T10:00:00Z");

async function setup() {
  const { org, user } = await createOrgWithAdmin(db);
  return { org, actor: { organizationId: org.id, userId: user.id } };
}
const activity = (over: Record<string, unknown>) =>
  ActivityInput.parse({ title: "Workshop", date: "2026-11-05", location: "Sapir College", ...over });

describe("truck schedule", () => {
  it("shows today's location, the next planned activities and the last known location", async () => {
    const { org, actor } = await setup();
    const past = await createActivity(db, actor, activity({ date: "2026-11-01", location: "Sderot" }));
    await updateActivity(db, actor, past.id, activity({ date: "2026-11-01", location: "Sderot", status: "DONE" }));
    await createActivity(db, actor, activity({ date: "2026-11-07", location: "Netivot", startTime: "09:00" }));
    await createActivity(db, actor, activity({ date: "2026-11-06", location: "Ofakim", status: "CANCELLED" }));

    let s = await getTruckSchedule(db, org.id, NOW);
    expect(s.today).toEqual([]);
    expect(s.lastLocation?.location).toBe("Sderot");
    expect(s.next.map((a) => a.location)).toEqual(["Netivot"]);

    await createActivity(db, actor, activity({ startTime: "08:30", endTime: "12:00" }));
    s = await getTruckSchedule(db, org.id, NOW);
    expect(s.today.map((a) => a.location)).toEqual(["Sapir College"]);
  });

  it("rejects an end time before the start time", () => {
    expect(ActivityInput.safeParse({ title: "x", date: "2026-11-05", location: "y", startTime: "12:00", endTime: "09:00" }).success).toBe(false);
  });
});

describe("dashboard overview", () => {
  it("collects alerts from faults, materials and unconfirmed activities, most urgent first", async () => {
    const { org, actor } = await setup();
    const laser = await createEquipment(db, actor, { name: "Laser", category: "Laser" });
    await createEquipment(db, actor, { name: "X2D 1", category: "3D" });
    await createEquipment(db, actor, { name: "Router (ordered)", category: "CNC", procurement: "ON_ORDER" });
    const f = await reportFault(db, actor, { equipmentId: laser.id, severity: "HIGH", description: "mirror" });
    await createInventoryItem(db, actor, { name: "PLA black", category: "פילמנט", unit: "גליל", initialQuantity: "1", minStockLevel: "2" });
    await createInventoryItem(db, actor, { name: "Acrylic 3mm", category: "אקריליק", unit: "לוח" });
    await createActivity(db, actor, activity({ date: "2026-11-02", title: "Old workshop" }));

    let o = await getOverview(db, org.id, NOW);
    expect(o.alerts.map((a) => [a.level, a.text])).toEqual([
      ["critical", "נגמר: Acrylic 3mm"],
      ["warning", "Laser: לא הוגדר מי מטפל בתקלה"],
      ["warning", "מלאי נמוך: PLA black (1 גליל)"],
      ["info", "לעדכן אם הפעילות בוצעה: Old workshop (02.11.2026)"],
    ]);
    expect(o.machines.map((m) => [m.name, m.condition])).toEqual([["Laser", "attention"], ["X2D 1", "ok"]]);
    expect([...o.materials.keys()]).toEqual(["אקריליק", "פילמנט"]);

    await updateFault(db, actor, f.id, { status: "IN_PROGRESS", handledBy: "Raz", expectedFixAt: day("2026-11-04") });
    o = await getOverview(db, org.id, NOW);
    expect(o.alerts.filter((a) => a.text.startsWith("Laser")).map((a) => a.level)).toEqual(["critical"]);
  });
});
