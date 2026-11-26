import { z } from "zod";

export const NewPasswordInput = z
  .object({
    password: z.string({ error: "שדה חובה" }).min(10, "לפחות 10 תווים").max(128, "עד 128 תווים"),
    confirmPassword: z.string({ error: "שדה חובה" }),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "הסיסמאות אינן זהות" });
export type NewPasswordInput = z.infer<typeof NewPasswordInput>;
