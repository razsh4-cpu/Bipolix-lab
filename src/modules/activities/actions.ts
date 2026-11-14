"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { ActivityFormInput } from "./schema";
import { createActivity, updateActivity } from "./service";

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

// Back to the calendar on the activity's day, so the admin sees what was saved.
const dayView = (date: Date) => `/schedule?view=day&date=${date.toISOString().slice(0, 10)}`;

async function actor() {
  const ctx = await requirePermission("activity.manage");
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

export async function createActivityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = ActivityFormInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  let activity;
  try {
    activity = await createActivity(db, who, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(dayView(activity.date));
}

export async function updateActivityAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = ActivityFormInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  let activity;
  try {
    activity = await updateActivity(db, who, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(dayView(activity.date));
}
