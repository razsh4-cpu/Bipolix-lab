"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { MemberUpdateInput, NewMemberInput, PasswordResetInput } from "./schema";
import { addMember, resetPassword, updateMember } from "./service";

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

async function actor() {
  const ctx = await requirePermission("users.manage");
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

export async function addMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  // The password field is not echoed back to the form after an error.
  const parsed = NewMemberInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    const failed = validationError(parsed.error, formData);
    if (failed.values) delete failed.values.password;
    return failed;
  }
  let id: string;
  try {
    id = await addMember(db, who, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/users/${id}?created=1`);
}

export async function updateMemberAction(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = MemberUpdateInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    await updateMember(db, who, userId, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  refresh();
  return { ok: true, message: "נשמר" };
}

export async function resetPasswordAction(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = PasswordResetInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await resetPassword(db, who, userId, parsed.data.password);
  } catch (error) {
    return domainFailure(error);
  }
  return { ok: true, message: "הסיסמה הוחלפה. המשתמש נותק מכל המכשירים." };
}
