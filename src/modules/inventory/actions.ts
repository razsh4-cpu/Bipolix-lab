"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import type { Permission } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { InventoryItemInput, NewInventoryItemInput, StockMovementInput } from "./schema";
import { createInventoryItem, recordStockMovement, updateInventoryItem } from "./service";

const MOVEMENT_PERMISSION: Record<StockMovementInput["type"], Permission> = {
  RECEIVE: "inventory.receive",
  ISSUE: "inventory.issue",
  ADJUST: "inventory.adjust",
};

async function actor(permission: Permission) {
  const ctx = await requirePermission(permission);
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

export async function createInventoryItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("inventory.manage");
  const parsed = NewInventoryItemInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  let id: string;
  try {
    id = (await createInventoryItem(db, who, parsed.data)).id;
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/inventory/${id}`);
}

export async function updateInventoryItemAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("inventory.manage");
  const parsed = InventoryItemInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateInventoryItem(db, who, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/inventory/${id}`);
}

export async function recordStockMovementAction(itemId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = StockMovementInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const who = await actor(MOVEMENT_PERMISSION[parsed.data.type]);
  try {
    await recordStockMovement(db, who, itemId, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  refresh();
  return { ok: true, message: "התנועה נרשמה" };
}
