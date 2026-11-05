"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import type { Permission } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { InventoryItemInput, NewInventoryItemInput, QuickMovementInput, StockMovementInput } from "./schema";
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

function itemFields(formData: FormData) {
  const equipmentIds = formData.getAll("equipmentIds").filter((v): v is string => typeof v === "string" && v !== "");
  return { ...formToObject(formData), equipmentIds };
}

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

export async function createInventoryItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("inventory.manage");
  const parsed = NewInventoryItemInput.safeParse(itemFields(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
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
  const parsed = InventoryItemInput.safeParse(itemFields(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  try {
    await updateInventoryItem(db, who, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/inventory/${id}`);
}

export async function recordStockMovementAction(itemId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = StockMovementInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  const who = await actor(MOVEMENT_PERMISSION[parsed.data.type]);
  try {
    await recordStockMovement(db, who, itemId, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  refresh();
  return { ok: true, message: "התנועה נרשמה" };
}

// One tap on the quick-entry screen: receive or issue the item's quick step.
export async function quickMovementAction(itemId: string, type: "RECEIVE" | "ISSUE"): Promise<ActionState> {
  const parsed = QuickMovementInput.safeParse({ type });
  if (!parsed.success) return { ok: false, message: "סוג תנועה לא תקין" };
  const who = await actor(MOVEMENT_PERMISSION[parsed.data.type]);
  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, organizationId: who.organizationId, archivedAt: null },
    select: { quickStep: true },
  });
  if (!item) return { ok: false, message: "הפריט לא נמצא" };
  try {
    await recordStockMovement(db, who, itemId, { type: parsed.data.type, quantity: item.quickStep.toString(), reason: "הזנה מהירה" });
  } catch (error) {
    return domainFailure(error);
  }
  refresh();
  return { ok: true, message: parsed.data.type === "RECEIVE" ? "נקלט" : "נרשם שימוש" };
}
