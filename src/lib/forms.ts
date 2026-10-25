import { z } from "zod";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = { ok: false };

// Empty form inputs become undefined so optional fields stay NULL instead of "".
export function formToObject(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value.trim();
  }
  return out;
}

export const optionalText = (max = 500) => z.string().max(max, `עד ${max} תווים`).optional();

export const requiredText = (max = 200) =>
  z.string({ error: "שדה חובה" }).min(1, "שדה חובה").max(max, `עד ${max} תווים`);

// "YYYY-MM-DD" from <input type="date"> → UTC midnight Date for DATE columns.
export const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין")
  .transform((s) => new Date(`${s}T00:00:00Z`))
  .optional();

export const requiredDate = z
  .string({ error: "שדה חובה" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין")
  .transform((s) => new Date(`${s}T00:00:00Z`));

export function validationError(error: z.ZodError): ActionState {
  return { ok: false, message: "יש לתקן את השדות המסומנים", fieldErrors: z.flattenError(error).fieldErrors };
}

export function toDateInput(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", dateStyle: "short" }).format(date);
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" }).format(date);
}
