"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { PrintRequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { PrintRequestInput, SchoolInput } from "./schema";
import { createPrintRequest, createSchool, renameSchool, setPrintRequestStatus, updatePrintRequest } from "./service";

async function actor() {
  const ctx = await requirePermission("school.manage");
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

export async function createSchoolAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = SchoolInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    await createSchool(db, who, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect("/schools");
}

export async function renameSchoolAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = SchoolInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    await renameSchool(db, who, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect("/schools");
}

export async function createPrintRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = PrintRequestInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    await createPrintRequest(db, who, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/schools#school-${parsed.data.schoolId}`);
}

export async function updatePrintRequestAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = PrintRequestInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    await updatePrintRequest(db, who, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/schools#school-${parsed.data.schoolId}`);
}

// One-tap "move to the next stage" button in the list.
export async function setPrintRequestStatusAction(id: string, status: PrintRequestStatus): Promise<void> {
  const who = await actor();
  if (!Object.values(PrintRequestStatus).includes(status)) return;
  await setPrintRequestStatus(db, who, id, status);
  refresh();
}
