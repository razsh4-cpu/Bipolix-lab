import { z } from "zod";
import { EquipmentProcurement, EquipmentStatus } from "@/generated/prisma/enums";
import { optionalDate, optionalText, requiredText } from "@/lib/forms";

const EquipmentFields = z.object({
  name: requiredText(120),
  category: requiredText(80),
  labId: z.string().optional(),
  procurement: z.enum(EquipmentProcurement, { error: "יש לבחור מצב רכש" }).optional(),
  manufacturer: optionalText(120),
  model: optionalText(120),
  serialNumber: optionalText(120),
  location: optionalText(120),
  purchaseDate: optionalDate,
  warrantyExpiresAt: optionalDate,
  notes: optionalText(2000),
  safetyInstructions: optionalText(4000),
});

// The "נדרש לרכישה" form only asks for category, model and notes, so the
// item's name is taken from the model (or the category when there is none).
export const EquipmentInput = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;
  if (r.procurement !== "TO_ORDER") return r;
  const name = (typeof r.model === "string" && r.model) || (typeof r.category === "string" && r.category) || r.name;
  return { ...r, name };
}, EquipmentFields);
export type EquipmentInput = z.infer<typeof EquipmentInput>;

export const EquipmentStatusChange = z.object({
  status: z.enum(EquipmentStatus, { error: "סטטוס לא תקין" }),
  reason: optionalText(500),
});
export type EquipmentStatusChange = z.infer<typeof EquipmentStatusChange>;
