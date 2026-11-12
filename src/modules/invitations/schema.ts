import { z } from "zod";
import { MemberRole } from "@/generated/prisma/enums";
import { requiredText } from "@/lib/forms";

export const InvitationInput = z.object({
  email: z.email("כתובת מייל לא תקינה").max(200),
  role: z.enum(MemberRole, { error: "יש לבחור תפקיד" }),
});
export type InvitationInput = z.infer<typeof InvitationInput>;

export const AcceptInvitationInput = z
  .object({
    name: requiredText(120),
    password: z.string({ error: "שדה חובה" }).min(10, "לפחות 10 תווים").max(128, "עד 128 תווים"),
    confirmPassword: z.string({ error: "שדה חובה" }),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "הסיסמאות אינן זהות" });
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationInput>;
