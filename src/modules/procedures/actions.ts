"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { ProcedureInput } from "./schema";
import { archiveProcedure, createProcedure, updateProcedure } from "./service";

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

async function actor() {
  const ctx = await requirePermission("procedure.manage");
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

export async function createProcedureAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = ProcedureInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  let id: string;
  try {
    id = (await createProcedure(db, who, parsed.data)).id;
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/procedures/${id}`);
}

export async function updateProcedureAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = ProcedureInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateProcedure(db, who, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/procedures/${id}`);
}

export async function archiveProcedureAction(id: string): Promise<void> {
  const who = await actor();
  await archiveProcedure(db, who, id);
  refresh();
  redirect("/procedures");
}
