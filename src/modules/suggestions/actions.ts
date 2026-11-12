"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { SuggestionInput, SuggestionReview } from "./schema";
import { createSuggestion, reviewSuggestion } from "./service";

async function actor(permission: "suggestion.create" | "suggestion.manage") {
  const ctx = await requirePermission(permission);
  // Public read-only visitors can see the page but must log in to write.
  if (ctx.isGuest) redirect("/login");
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

export async function createSuggestionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("suggestion.create");
  const parsed = SuggestionInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  await createSuggestion(db, who, parsed.data);
  refresh();
  return { ok: true, message: "תודה! ההצעה נשלחה." };
}

export async function reviewSuggestionAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("suggestion.manage");
  const parsed = SuggestionReview.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    await reviewSuggestion(db, who, id, parsed.data);
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "עודכן" };
}
