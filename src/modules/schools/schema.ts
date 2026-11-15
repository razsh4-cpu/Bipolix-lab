import { z } from "zod";
import { PrintRequestStatus } from "@/generated/prisma/enums";
import { requiredText } from "@/lib/forms";

export const SchoolInput = z.object({
  name: requiredText(120),
});
export type SchoolInput = z.infer<typeof SchoolInput>;

// A pasted link without "https://" (e.g. "drive.google.com/...") still works.
const filesUrl = z
  .string()
  .max(2000, "עד 2000 תווים")
  .transform((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`))
  .refine((s) => {
    try {
      const u = new URL(s);
      return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
    } catch {
      return false;
    }
  }, "קישור לא תקין")
  .optional();

const quantity = z
  .string()
  .regex(/^\d+$/, "יש להזין מספר שלם")
  .transform(Number)
  .refine((n) => n >= 1 && n <= 10000, "כמות בין 1 ל-10000")
  .optional();

export const PrintRequestInput = z.object({
  schoolId: requiredText(64),
  description: requiredText(2000),
  quantity,
  filesUrl,
  status: z.enum(PrintRequestStatus, { error: "יש לבחור סטטוס" }),
});
export type PrintRequestInput = z.infer<typeof PrintRequestInput>;
