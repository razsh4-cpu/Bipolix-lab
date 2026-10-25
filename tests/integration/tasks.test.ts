import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createTask, listTasks, updateTaskStatus } from "@/modules/tasks/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

async function setup() {
  const { org, user } = await createOrgWithAdmin(db);
  const instructor = await db.user.create({ data: { id: randomUUID(), name: "Inst", email: `i-${randomUUID()}@t.local` } });
  await db.membership.create({ data: { userId: instructor.id, organizationId: org.id, role: "INSTRUCTOR" } });
  const viewer = await db.user.create({ data: { id: randomUUID(), name: "View", email: `v-${randomUUID()}@t.local` } });
  await db.membership.create({ data: { userId: viewer.id, organizationId: org.id, role: "VIEWER" } });
  return { org, admin: { organizationId: org.id, userId: user.id }, instructor, viewer };
}

describe("tasks", () => {
  it("lets an instructor update only tasks assigned to them", async () => {
    const { admin, instructor, org } = await setup();
    const mine = await createTask(db, admin, { title: "mine", assigneeId: instructor.id, priority: "MEDIUM", status: "TODO" });
    const notMine = await createTask(db, admin, { title: "other", priority: "MEDIUM", status: "TODO" });
    const inst = { organizationId: org.id, userId: instructor.id, role: "INSTRUCTOR" as const };
    const done = await updateTaskStatus(db, inst, mine.id, { status: "COMPLETED" });
    expect(done.completedAt).not.toBeNull();
    await expect(updateTaskStatus(db, inst, notMine.id, { status: "COMPLETED" })).rejects.toThrow("אפשר לעדכן רק משימות שמשויכות אליך");
  });

  it("refuses to assign tasks to a viewer or someone outside the organization", async () => {
    const { admin, viewer } = await setup();
    const other = await setup();
    await expect(createTask(db, admin, { title: "x", assigneeId: viewer.id, priority: "MEDIUM", status: "TODO" })).rejects.toThrow();
    await expect(createTask(db, admin, { title: "x", assigneeId: other.instructor.id, priority: "MEDIUM", status: "TODO" })).rejects.toThrow();
  });

  it("marks open tasks past their due date as overdue", async () => {
    const { admin, org } = await setup();
    await createTask(db, admin, { title: "late", dueDate: new Date("2026-10-01T00:00:00Z"), priority: "MEDIUM", status: "TODO" });
    await createTask(db, admin, { title: "done late", dueDate: new Date("2026-10-01T00:00:00Z"), priority: "MEDIUM", status: "COMPLETED" });
    const tasks = await listTasks(db, org.id, {}, new Date("2026-10-25T10:00:00Z"));
    expect(Object.fromEntries(tasks.map((t) => [t.title, t.isOverdue]))).toEqual({ late: true, "done late": false });
  });
});
