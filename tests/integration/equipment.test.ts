import { afterAll, describe, expect, it } from "vitest";
import { EquipmentInput } from "@/modules/equipment/schema";
import { changeEquipmentStatus, createEquipment, listEquipment, listEquipmentCategories, updateEquipment } from "@/modules/equipment/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

describe("equipment service", () => {
  it("validates required fields and turns empty dates into undefined", () => {
    expect(EquipmentInput.safeParse({ category: "CNC" }).success).toBe(false);
    const ok = EquipmentInput.parse({ name: "CNC", category: "CNC", purchaseDate: "2024-05-01" });
    expect(ok.purchaseDate?.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  it("creates equipment with an audit entry", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const e = await createEquipment(db, actor, { name: "Laser", category: "Laser" });
    expect(e.status).toBe("OPERATIONAL");
    const audit = await db.auditLog.findMany({ where: { entityId: e.id } });
    expect(audit.map((a) => a.action)).toEqual(["equipment.create"]);
  });

  it("clears optional fields on update", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const e = await createEquipment(db, actor, { name: "A", category: "C", manufacturer: "Acme" });
    const updated = await updateEquipment(db, actor, e.id, { name: "A", category: "C" });
    expect(updated.manufacturer).toBeNull();
  });

  it("cannot touch another organization's equipment", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const e = await createEquipment(db, { organizationId: a.org.id, userId: a.user.id }, { name: "A", category: "C" });
    const intruder = { organizationId: b.org.id, userId: b.user.id };
    await expect(updateEquipment(db, intruder, e.id, { name: "hacked", category: "C" })).rejects.toThrow("הציוד לא נמצא");
    await expect(changeEquipmentStatus(db, intruder, e.id, { status: "OUT_OF_SERVICE" })).rejects.toThrow();
    expect(await listEquipment(db, b.org.id)).toHaveLength(0);
  });

  it("records status changes with from/to in the audit log", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const e = await createEquipment(db, actor, { name: "A", category: "C" });
    await changeEquipmentStatus(db, actor, e.id, { status: "OUT_OF_SERVICE", reason: "smoke" });
    const log = await db.auditLog.findFirst({ where: { entityId: e.id, action: "equipment.status" } });
    expect(log?.details).toEqual({ from: "OPERATIONAL", to: "OUT_OF_SERVICE", reason: "smoke" });
  });

  it("searches by name, manufacturer and location", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    await createEquipment(db, actor, { name: "מדפסת 1", category: "3D", manufacturer: "Bambu Lab" });
    await createEquipment(db, actor, { name: "CNC", category: "CNC", location: "מדף אחורי" });
    expect((await listEquipment(db, org.id, { q: "bambu" })).map((e) => e.name)).toEqual(["מדפסת 1"]);
    expect((await listEquipment(db, org.id, { q: "אחורי" })).map((e) => e.name)).toEqual(["CNC"]);
  });

  it("offers the default categories first, then other categories in use", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    await createEquipment(db, { organizationId: org.id, userId: user.id }, { name: "Saw", category: "נגרות" });
    const categories = await listEquipmentCategories(db, org.id);
    expect(categories).toEqual(expect.arrayContaining(["כללי", "נגרות"]));
    expect(categories).not.toContain("פיתוחים בתהליך");
    expect(categories.at(-1)).toBe("נגרות");
  });

  it("keeps the procurement stage, defaulting to equipment already in the lab", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const existing = await createEquipment(db, actor, { name: "A", category: "CNC" });
    const ordered = await createEquipment(db, actor, { name: "B", category: "CNC", procurement: "ON_ORDER" });
    expect(existing.procurement).toBe("IN_SERVICE");
    expect(ordered.procurement).toBe("ON_ORDER");
    await updateEquipment(db, actor, ordered.id, { name: "B", category: "CNC", procurement: "IN_SERVICE" });
    expect((await listEquipment(db, org.id)).map((e) => [e.name, e.procurement])).toEqual([["A", "IN_SERVICE"], ["B", "IN_SERVICE"]]);
    expect(EquipmentInput.safeParse({ name: "x", category: "y", procurement: "BOGUS" }).success).toBe(false);
  });
});
