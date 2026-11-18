import { afterAll, describe, expect, it } from "vitest";
import { createTask, listImportantTasks } from "@/modules/tasks/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

describe("important tasks on the dashboard", () => {
  it("shows open high/urgent or overdue tasks, overdue first", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const other = await createOrgWithAdmin(db);
    const a = { organizationId: org.id, userId: user.id };
    const now = new Date("2026-11-18T10:00:00Z");
    await createTask(db, a, { title: "normal", priority: "MEDIUM", status: "TODO" });
    await createTask(db, a, { title: "high", priority: "HIGH", status: "TODO" });
    await createTask(db, a, { title: "urgent", priority: "URGENT", status: "IN_PROGRESS" });
    await createTask(db, a, { title: "late", priority: "LOW", status: "TODO", dueDate: new Date("2026-11-10T00:00:00Z") });
    await createTask(db, a, { title: "done urgent", priority: "URGENT", status: "COMPLETED" });
    await createTask(db, { organizationId: other.org.id, userId: other.user.id }, { title: "elsewhere", priority: "URGENT", status: "TODO" });

    const rows = await listImportantTasks(db, org.id, now);
    expect(rows.map((t) => t.title)).toEqual(["late", "urgent", "high"]);
    expect(rows[0].isOverdue).toBe(true);
  });
});
