import { z } from "zod";
import { DevelopmentStatus } from "@/generated/prisma/enums";
import { optionalDate, optionalText, requiredText } from "@/lib/forms";

export const DevelopmentInput = z.object({
  title: requiredText(150),
  description: optionalText(4000),
  status: z.enum(DevelopmentStatus, { error: "יש לבחור סטטוס" }),
  owner: optionalText(120),
  targetDate: optionalDate,
});
export type DevelopmentInput = z.infer<typeof DevelopmentInput>;
