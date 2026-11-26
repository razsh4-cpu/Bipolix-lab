"use server";

import { redirect } from "next/navigation";
import { appBaseUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { NewPasswordInput } from "./schema";
import { createPasswordResetLink, redeemPasswordResetLink } from "./service";

export type ResetLinkState = ActionState & { link?: string; email?: string };

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

export async function createResetLinkAction(userId: string, _prev: ResetLinkState, _formData: FormData): Promise<ResetLinkState> {
  const ctx = await requirePermission("users.manage");
  try {
    const { token, email } = await createPasswordResetLink(db, { organizationId: ctx.organization.id, userId: ctx.user.id }, userId);
    return { ok: true, message: "הקישור נוצר", link: `${await appBaseUrl()}/reset/${token}`, email };
  } catch (error) {
    return domainFailure(error);
  }
}

// Public: anyone holding a valid link may use it once.
export async function setNewPasswordAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = NewPasswordInput.safeParse(formToObject(formData));
  if (!parsed.success) {
    const failed = validationError(parsed.error, formData);
    if (failed.values) {
      delete failed.values.password;
      delete failed.values.confirmPassword;
    }
    return failed;
  }
  let email: string;
  try {
    email = (await redeemPasswordResetLink(db, token, parsed.data)).email;
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/login?reset=1&email=${encodeURIComponent(email)}`);
}
