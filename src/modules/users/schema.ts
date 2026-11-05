import { z } from "zod";
import { MemberRole } from "@/generated/prisma/enums";
import { requiredText } from "@/lib/forms";

const password = z.string({ error: "שדה חובה" }).min(10, "לפחות 10 תווים").max(128, "עד 128 תווים");

export const NewMemberInput = z.object({
  name: requiredText(120),
  email: z.email("כתובת מייל לא תקינה").max(200),
  role: z.enum(MemberRole, { error: "יש לבחור תפקיד" }),
  password,
});
export type NewMemberInput = z.infer<typeof NewMemberInput>;

export const MemberUpdateInput = z.object({
  role: z.enum(MemberRole, { error: "יש לבחור תפקיד" }),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});
export type MemberUpdateInput = z.infer<typeof MemberUpdateInput>;

export const PasswordResetInput = z.object({ password });
