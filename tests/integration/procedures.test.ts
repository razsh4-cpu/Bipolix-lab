import { afterAll, describe, expect, it } from "vitest";
import { createEquipment } from "@/modules/equipment/service";
import { archiveProcedure, createProcedure, getProcedure, listProcedures, updateProcedure } from "@/modules/procedures/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

const base = { title: "Laser safety", kind: "SAFETY" as const, body: "v1 body", source: "Manufacturer manual p.4" };

describe("procedures", () => {
  it("keeps every content version and only bumps the version when content changes", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const p = await createProcedure(db, actor, base);
    await updateProcedure(db, actor, p.id, { ...base, body: "v2 body" });
    await updateProcedure(db, actor, p.id, { ...base, body: "v2 body", kind: "OPERATION" });
    const full = await getProcedure(db, org.id, p.id);
    expect(full?.version).toBe(2);
    expect(full?.kind).toBe("OPERATION");
    expect(full?.revisions.map((r) => [r.version, r.body])).toEqual([[2, "v2 body"], [1, "v1 body"]]);
    await expect(db.procedureRevision.update({ where: { id: full!.revisions[1].id }, data: { body: "x" } })).rejects.toThrow();
  });

  it("links to a machine of the same organization only, and hides archived ones", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const actorA = { organizationId: a.org.id, userId: a.user.id };
    const actorB = { organizationId: b.org.id, userId: b.user.id };
    const machineB = await createEquipment(db, actorB, { name: "CNC", category: "CNC" });
    await expect(createProcedure(db, actorA, { ...base, equipmentId: machineB.id })).rejects.toThrow("הציוד לא נמצא");

    const own = await createEquipment(db, actorA, { name: "Laser", category: "Laser" });
    const p = await createProcedure(db, actorA, { ...base, equipmentId: own.id });
    expect((await listProcedures(db, a.org.id, { equipmentId: own.id })).map((x) => x.id)).toEqual([p.id]);
    expect(await listProcedures(db, b.org.id)).toEqual([]);
    await archiveProcedure(db, actorA, p.id);
    expect(await listProcedures(db, a.org.id)).toEqual([]);
  });
});
