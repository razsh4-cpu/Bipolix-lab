import { z } from "zod";
import { ActivityRecurrence, ActivityStatus } from "@/generated/prisma/enums";
import { optionalDate, optionalText, requiredDate, requiredText } from "@/lib/forms";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "שעה בפורמט 09:30").optional();

export const ActivityInput = z
  .object({
    title: requiredText(160),
    date: requiredDate,
    startTime: time,
    endTime: time,
    location: requiredText(200),
    audience: optionalText(200),
    participants: z.coerce.number({ error: "מספר" }).int("מספר שלם").min(0).max(10000).optional(),
    status: z.enum(ActivityStatus, { error: "סטטוס לא תקין" }).default("PLANNED"),
    notes: optionalText(2000),
    recurrence: z.enum(ActivityRecurrence, { error: "בחירה לא תקינה" }).default("NONE"),
    recurrenceUntil: optionalDate,
  })
  .refine((a) => !a.startTime || !a.endTime || a.startTime < a.endTime, {
    message: "שעת הסיום צריכה להיות אחרי שעת ההתחלה",
    path: ["endTime"],
  })
  .refine((a) => !a.recurrenceUntil || a.recurrenceUntil >= a.date, {
    message: "תאריך הסיום צריך להיות אחרי תאריך הפעילות",
    path: ["recurrenceUntil"],
  })
  // Guards against a mistyped year (e.g. 2017 instead of 2026) hiding the activity far from today.
  .refine((a) => a.date.getUTCFullYear() >= 2024 && a.date.getUTCFullYear() <= 2100, {
    message: "בדוק את השנה בתאריך",
    path: ["date"],
  });
export type ActivityInput = z.infer<typeof ActivityInput>;

// The form asks for a start time so every activity shows on the calendar with its hour.
export const ActivityFormInput = ActivityInput.refine((a) => !!a.startTime, { message: "שדה חובה", path: ["startTime"] });
