"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { TaskInput, TaskStatusInput } from "./schema";
import { createTask, updateTask, updateTaskStatus } from "./service";

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

export async function createTaskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requirePermission("task.manage");
  const parsed = TaskInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  let id: string;
  try {
    id = (await createTask(db, { organizationId: ctx.organization.id, userId: ctx.user.id }, parsed.data)).id;
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/tasks/${id}`);
}

export async function updateTaskAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requirePermission("task.manage");
  const parsed = TaskInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateTask(db, { organizationId: ctx.organization.id, userId: ctx.user.id }, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/tasks/${id}`);
}

export async function updateTaskStatusAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requirePermission("task.updateOwn");
  const parsed = TaskStatusInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateTaskStatus(db, { organizationId: ctx.organization.id, userId: ctx.user.id, role: ctx.role }, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  refresh();
  return { ok: true, message: "הסטטוס עודכן" };
}
