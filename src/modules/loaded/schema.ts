import { z } from "zod";

export const LoadMaterialInput = z.object({
  itemId: z.string({ error: "יש לבחור חומר" }).min(1, "יש לבחור חומר"),
  // Free label for the position in the machine, e.g. "AMS 1 · 2". Empty = the whole machine.
  slot: z.string().trim().max(40, "עד 40 תווים").default(""),
});
export type LoadMaterialInput = z.input<typeof LoadMaterialInput>;

// Suggestions for the slot field; any other label is allowed.
export const SLOT_SUGGESTIONS = ["AMS 1 · 1", "AMS 1 · 2", "AMS 1 · 3", "AMS 1 · 4", "AMS 2 · 1", "AMS 2 · 2", "AMS 2 · 3", "AMS 2 · 4", "גליל חיצוני", "ראש שמאל", "ראש ימין"];
