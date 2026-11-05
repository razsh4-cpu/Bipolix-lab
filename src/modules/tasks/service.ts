import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { MemberRole, TaskStatus } from "@/generated/prisma/enums";
import { writeAudit } from "@/lib/audit";
import { startOfToday } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { DomainError, type Actor } from "@/modules/types";
import type { TaskInput, TaskStatusInput } from "./schema";

export type TaskFilters = { assigneeId?: string; status?: TaskStatus | "OPEN" };

export async function listTasks(db: PrismaClient, organizationId: string, filters: TaskFilters = {}, now = new Date()) {
  const where: Prisma.TaskWhereInput = { organizationId };
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.status === "OPEN") where.status = { not: "COMPLETED" };
  else if (filters.status) where.status = filters.status;
  const today = startOfToday(now);
  const tasks = await db.task.findMany({
    where,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
    include: { assignee: { select: { name: true } }, equipment: { select: { name: true } } },
  });
  return tasks.map((t) => ({ ...t, isOverdue: t.status !== "COMPLETED" && t.dueDate !== null && t.dueDate < today }));
}

export function getTask(db: PrismaClient, organizationId: string, id: string) {
  return db.task.findFirst({
    where: { id, organizationId },
    include: {
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      equipment: { select: { id: true, name: true } },
    },
  });
}

// Members who can be assigned work: admins and instructors of the organization.
export async function assignableMembers(db: PrismaClient, organizationId: string) {
  const members = await db.membership.findMany({
    where: { organizationId, role: { in: ["ADMIN", "INSTRUCTOR"] }, user: { isActive: true } },
    select: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return members.map((m) => m.user);
}

async function validateRefs(tx: Prisma.TransactionClient, organizationId: string, input: TaskInput) {
  if (input.assigneeId) {
    const member = await tx.membership.findFirst({
      where: { organizationId, userId: input.assigneeId, role: { in: ["ADMIN", "INSTRUCTOR"] } },
    });
    if (!member) throw new DomainError("המשתמש שנבחר אינו חבר צוות בארגון");
  }
  if (input.equipmentId) {
    const eq = await tx.equipment.findFirst({ where: { id: input.equipmentId, organizationId } });
    if (!eq) throw new DomainError("הציוד שנבחר לא נמצא");
  }
}

export function createTask(db: PrismaClient, actor: Actor, input: TaskInput) {
  return db.$transaction(async (tx) => {
    await validateRefs(tx, actor.organizationId, input);
    const task = await tx.task.create({
      data: {
        ...input,
        organizationId: actor.organizationId,
        createdById: actor.userId,
        completedAt: input.status === "COMPLETED" ? new Date() : null,
      },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "task.create",
      entityType: "Task",
      entityId: task.id,
    });
    return task;
  });
}

export function updateTask(db: PrismaClient, actor: Actor, id: string, input: TaskInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("המשימה לא נמצאה");
    await validateRefs(tx, actor.organizationId, input);
    const task = await tx.task.update({
      where: { id },
      data: {
        description: null,
        assigneeId: null,
        dueDate: null,
        equipmentId: null,
        notes: null,
        ...input,
        completedAt: input.status === "COMPLETED" ? (existing.completedAt ?? new Date()) : null,
      },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "task.update",
      entityType: "Task",
      entityId: id,
    });
    return task;
  });
}

// Admins may change any task; instructors only tasks assigned to them.
export function updateTaskStatus(db: PrismaClient, actor: Actor & { role: MemberRole }, id: string, input: TaskStatusInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("המשימה לא נמצאה");
    const allowed = can(actor.role, "task.manage") || (can(actor.role, "task.updateOwn") && existing.assigneeId === actor.userId);
    if (!allowed) throw new DomainError("אפשר לעדכן רק משימות שמשויכות אליך");
    if (existing.status === input.status) return existing;
    const task = await tx.task.update({
      where: { id },
      data: { status: input.status, completedAt: input.status === "COMPLETED" ? new Date() : null },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "task.status",
      entityType: "Task",
      entityId: id,
      details: { from: existing.status, to: input.status },
    });
    return task;
  });
}
