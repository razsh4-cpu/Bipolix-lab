import { z } from "zod";
import { optionalText, requiredText } from "@/lib/forms";

// Quantities travel as strings to keep exact decimal precision (up to 3 places).
const quantityString = z
  .string({ error: "שדה חובה" })
  .regex(/^\d{1,9}(\.\d{1,3})?$/, "מספר חיובי, עד 3 ספרות אחרי הנקודה");

const positiveQuantity = quantityString.refine((s) => Number(s) > 0, "הכמות חייבת להיות גדולה מאפס");

export const InventoryItemInput = z.object({
  name: requiredText(120),
  category: requiredText(80),
  unit: requiredText(20),
  labId: z.string().optional(),
  minStockLevel: quantityString.optional(),
  storageLocation: optionalText(120),
  supplier: optionalText(120),
  unitCost: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, "מחיר לא תקין").optional(),
  notes: optionalText(2000),
});
export type InventoryItemInput = z.infer<typeof InventoryItemInput>;

export const NewInventoryItemInput = InventoryItemInput.extend({
  initialQuantity: quantityString.optional(),
});
export type NewInventoryItemInput = z.infer<typeof NewInventoryItemInput>;

export const StockMovementInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("RECEIVE"), quantity: positiveQuantity, reason: optionalText(300) }),
  z.object({ type: z.literal("ISSUE"), quantity: positiveQuantity, reason: optionalText(300) }),
  // An adjustment sets the counted quantity; the reason is mandatory.
  z.object({ type: z.literal("ADJUST"), quantity: quantityString, reason: requiredText(300) }),
], { error: "סוג תנועה לא תקין" });
export type StockMovementInput = z.infer<typeof StockMovementInput>;

export const INVENTORY_CATEGORY_SUGGESTIONS = [
  "עץ",
  "אקריליק",
  "ויניל",
  "פילמנט",
  "כלי חיתוך",
  "חלקי חילוף",
  "אלקטרוניקה",
  "מתכלים",
  "אחר",
];
