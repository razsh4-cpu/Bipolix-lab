import { z } from "zod";
import { ProcedureKind } from "@/generated/prisma/enums";
import { requiredText } from "@/lib/forms";

export const ProcedureInput = z.object({
  title: requiredText(160),
  kind: z.enum(ProcedureKind, { error: "יש לבחור סוג נוהל" }),
  // Empty means a general procedure for the whole lab.
  equipmentId: z.string().optional(),
  body: requiredText(20000),
  source: requiredText(300),
});
export type ProcedureInput = z.infer<typeof ProcedureInput>;
