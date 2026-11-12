"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { DevelopmentInput } from "./schema";
import { createDevelopment, updateDevelopment } from "./service";

async function actor() {
  const ctx = await requirePermission("development.manage");
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

export async function createDevelopmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = DevelopmentInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  await createDevelopment(db, who, parsed.data);
  redirect("/developments");
}

export async function updateDevelopmentAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = DevelopmentInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    await updateDevelopment(db, who, id, parsed.data);
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, message: error.message };
    throw error;
  }
  redirect("/developments");
}
