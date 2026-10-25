"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { EquipmentInput, EquipmentStatusChange } from "./schema";
import { archiveEquipment, changeEquipmentStatus, createEquipment, updateEquipment } from "./service";

async function actor(permission: Parameters<typeof requirePermission>[0]) {
  const ctx = await requirePermission(permission);
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

export async function createEquipmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("equipment.manage");
  const parsed = EquipmentInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  let id: string;
  try {
    id = (await createEquipment(db, who, parsed.data)).id;
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/equipment/${id}`);
}

export async function updateEquipmentAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("equipment.manage");
  const parsed = EquipmentInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateEquipment(db, who, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/equipment/${id}`);
}

export async function changeEquipmentStatusAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("equipment.returnToService");
  const parsed = EquipmentStatusChange.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await changeEquipmentStatus(db, who, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  refresh();
  return { ok: true, message: "הסטטוס עודכן" };
}

export async function archiveEquipmentAction(id: string): Promise<void> {
  const who = await actor("equipment.manage");
  await archiveEquipment(db, who, id);
  redirect("/equipment");
}
