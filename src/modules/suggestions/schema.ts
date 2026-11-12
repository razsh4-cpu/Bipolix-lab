import { z } from "zod";
import { SuggestionStatus } from "@/generated/prisma/enums";
import { optionalText, requiredText } from "@/lib/forms";

export const SuggestionInput = z.object({
  title: requiredText(150),
  details: optionalText(2000),
});
export type SuggestionInput = z.infer<typeof SuggestionInput>;

export const SuggestionReview = z.object({
  status: z.enum(SuggestionStatus, { error: "סטטוס לא תקין" }),
  adminResponse: optionalText(1000),
});
export type SuggestionReview = z.infer<typeof SuggestionReview>;
