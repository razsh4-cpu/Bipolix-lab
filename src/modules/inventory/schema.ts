import { z } from "zod";
import { COLOR_PATTERN } from "@/lib/colors";
import { optionalText, requiredText } from "@/lib/forms";

// Quantities travel as strings to keep exact decimal precision (up to 3 places).
const quantityString = z
  .string({ error: "שדה חובה" })
  .regex(/^\d{1,9}(\.\d{1,3})?$/, "מספר חיובי, עד 3 ספרות אחרי הנקודה");

const positiveQuantity = quantityString.refine((s) => Number(s) > 0, "הכמות חייבת להיות גדולה מאפס");

export const InventoryItemInput = z.object({
  name: requiredText(120),
  category: requiredText(80),
  color: z.string().toLowerCase().regex(COLOR_PATTERN, "צבע לא תקין").optional(),
  unit: requiredText(20),
  labId: z.string().optional(),
  minStockLevel: quantityString.optional(),
  storageLocation: optionalText(120),
  supplier: optionalText(120),
  unitCost: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, "מחיר לא תקין").optional(),
  // How much one tap on the quick-entry screen adds or removes.
  quickStep: positiveQuantity.optional(),
  // Machines this item serves (spare parts, consumables, filament).
  equipmentIds: z.array(z.string().min(1)).max(50).default([]),
  notes: optionalText(2000),
});
export type InventoryItemInput = z.input<typeof InventoryItemInput>;

export const NewInventoryItemInput = InventoryItemInput.extend({
  initialQuantity: quantityString.optional(),
});
export type NewInventoryItemInput = z.input<typeof NewInventoryItemInput>;

export const StockMovementInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("RECEIVE"), quantity: positiveQuantity, reason: optionalText(300) }),
  z.object({ type: z.literal("ISSUE"), quantity: positiveQuantity, reason: optionalText(300) }),
  // An adjustment sets the counted quantity; the reason is mandatory.
  z.object({ type: z.literal("ADJUST"), quantity: quantityString, reason: requiredText(300) }),
], { error: "סוג תנועה לא תקין" });
export type StockMovementInput = z.infer<typeof StockMovementInput>;

export const QuickMovementInput = z.object({
  type: z.enum(["RECEIVE", "ISSUE"], { error: "סוג תנועה לא תקין" }),
});

export const INVENTORY_UNIT_SUGGESTIONS = ["יח'", "גליל", "גרם", "ק״ג", "מטר", "לוח", "ליטר", "חבילה"];

// Offered in the category field; any other category can still be typed.
export const INVENTORY_CATEGORY_SUGGESTIONS = ["גלילי פילמנט"];

// Printing filament categories, where a colour is asked for.
export function isFilamentCategory(category: string) {
  return /פילמנט|filament/i.test(category);
}

// The add form no longer asks for a unit: filament is counted in spools, everything else in units.
export function defaultUnitFor(category: string) {
  return isFilamentCategory(category) ? "גליל" : "יח'";
}

// The add form offers "גליל פילמנט" as a ready-made item name. A spool's material
// type becomes part of its name (e.g. "גליל פילמנט PETG") so it shows everywhere
// the item is listed, and the category is set behind the scenes.
export const FILAMENT_ITEM_NAME = "גליל פילמנט";
export const FILAMENT_CATEGORY = "גלילי פילמנט";
export const GENERAL_CATEGORY = "כללי";
export const FILAMENT_TYPES = ["PLA", "PETG", "TPU"] as const;

const FilamentChoice = z.object({
  materialType: z.enum(FILAMENT_TYPES, { error: "יש לבחור סוג גליל" }),
});

// Turns the add form's choices (item kind, spool type) into the stored fields.
// Returns either the fields to validate as an item, or the spool-type error.
export function resolveNewItemFields(raw: Record<string, unknown>):
  | { ok: true; fields: Record<string, unknown> }
  | { ok: false; error: z.ZodError } {
  const { itemKind, materialType, ...rest } = raw;
  if (itemKind === "filament") {
    const choice = FilamentChoice.safeParse({ materialType });
    if (!choice.success) return { ok: false, error: choice.error };
    return {
      ok: true,
      fields: { ...rest, name: `${FILAMENT_ITEM_NAME} ${choice.data.materialType}`, category: FILAMENT_CATEGORY, unit: "גליל" },
    };
  }
  const category = typeof rest.category === "string" && rest.category.trim() ? rest.category : GENERAL_CATEGORY;
  return { ok: true, fields: { ...rest, category, unit: rest.unit ?? defaultUnitFor(category) } };
}
