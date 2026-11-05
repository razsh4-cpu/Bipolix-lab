import { z } from "zod";
import { EquipmentStatus } from "@/generated/prisma/enums";
import { optionalDate, optionalText, requiredText } from "@/lib/forms";

export const EquipmentInput = z.object({
  name: requiredText(120),
  category: requiredText(80),
  labId: z.string().optional(),
  manufacturer: optionalText(120),
  model: optionalText(120),
  serialNumber: optionalText(120),
  location: optionalText(120),
  purchaseDate: optionalDate,
  warrantyExpiresAt: optionalDate,
  notes: optionalText(2000),
  safetyInstructions: optionalText(4000),
});
export type EquipmentInput = z.infer<typeof EquipmentInput>;

export const EquipmentStatusChange = z.object({
  status: z.enum(EquipmentStatus, { error: "סטטוס לא תקין" }),
  reason: optionalText(500),
});
export type EquipmentStatusChange = z.infer<typeof EquipmentStatusChange>;
