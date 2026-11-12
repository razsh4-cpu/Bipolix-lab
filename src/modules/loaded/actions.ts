"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { LoadMaterialInput } from "./schema";
import { loadMaterial, unloadMaterial } from "./service";

// Whoever may record material use on the truck may also record what is loaded.
async function actor() {
  const ctx = await requirePermission("inventory.issue");
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

export async function loadMaterialAction(equipmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor();
  const parsed = LoadMaterialInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    await loadMaterial(db, who, equipmentId, parsed.data);
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "נשמר" };
}

export async function unloadMaterialAction(loadedId: string): Promise<void> {
  const who = await actor();
  try {
    await unloadMaterial(db, who, loadedId);
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
  }
  refresh();
}
