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

export const INVENTORY_CATEGORY_SUGGESTIONS = [
  "עץ",
  "אקריליק",
  "ויניל",
  "פילמנט",
  "כלי חיתוך",
  "חלקי חילוף",
  "נחירים",
  "להבים",
  "אלקטרוניקה",
  "מתכלים",
  "אחר",
];
