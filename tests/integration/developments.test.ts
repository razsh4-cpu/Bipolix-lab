import { afterAll, describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";
import { DevelopmentInput } from "@/modules/developments/schema";
import { createDevelopment, listDevelopments, updateDevelopment } from "@/modules/developments/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

describe("truck development projects", () => {
  it("only admins manage, everyone views", () => {
    expect(can("VIEWER", "development.view")).toBe(true);
    expect(can("INSTRUCTOR", "development.manage")).toBe(false);
    expect(can("ADMIN", "development.manage")).toBe(true);
    expect(DevelopmentInput.safeParse({ title: "x" }).success).toBe(false);
  });

  it("creates, updates and clears fields, within one organization", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const actor = { organizationId: a.org.id, userId: a.user.id };
    const d = await createDevelopment(db, actor, { title: "Robotics station", status: "IN_PROGRESS", owner: "Raz", targetDate: new Date("2026-12-01T00:00:00Z") });
    await updateDevelopment(db, actor, d.id, { title: "Robotics station", status: "TESTING" });
    const [row] = await listDevelopments(db, a.org.id);
    expect(row).toMatchObject({ status: "TESTING", owner: null, targetDate: null });
    expect(await listDevelopments(db, b.org.id)).toEqual([]);
    await expect(updateDevelopment(db, { organizationId: b.org.id, userId: b.user.id }, d.id, { title: "x", status: "DONE" })).rejects.toThrow("הפיתוח לא נמצא");
  });
});
