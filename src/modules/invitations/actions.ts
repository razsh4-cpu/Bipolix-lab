"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { AcceptInvitationInput, InvitationInput } from "./schema";
import { acceptInvitation, createInvitation, revokeInvitation } from "./service";

export type InvitationState = ActionState & { link?: string; email?: string };

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

// Links point at the production address when it is known, so a link created
// from a preview deploy still opens the live site.
async function appBaseUrl() {
  const configured = process.env.BETTER_AUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function createInvitationAction(_prev: InvitationState, formData: FormData): Promise<InvitationState> {
  const ctx = await requirePermission("users.manage");
  const parsed = InvitationInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    const { invitation, token } = await createInvitation(db, { organizationId: ctx.organization.id, userId: ctx.user.id }, parsed.data);
    refresh();
    return { ok: true, message: "ההזמנה נוצרה", link: `${await appBaseUrl()}/invite/${token}`, email: invitation.email };
  } catch (error) {
    return domainFailure(error);
  }
}

export async function revokeInvitationAction(id: string): Promise<void> {
  const ctx = await requirePermission("users.manage");
  try {
    await revokeInvitation(db, { organizationId: ctx.organization.id, userId: ctx.user.id }, id);
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
  }
  refresh();
}

// Public: anyone holding a valid link may use it once.
export async function acceptInvitationAction(token: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = AcceptInvitationInput.safeParse(formToObject(formData));
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
    email = (await acceptInvitation(db, token, parsed.data)).email;
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/login?invited=1&email=${encodeURIComponent(email)}`);
}
