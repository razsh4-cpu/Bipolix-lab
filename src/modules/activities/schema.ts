import { z } from "zod";
import { ActivityStatus } from "@/generated/prisma/enums";
import { optionalText, requiredDate, requiredText } from "@/lib/forms";

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
  })
  .refine((a) => !a.startTime || !a.endTime || a.startTime < a.endTime, {
    message: "שעת הסיום צריכה להיות אחרי שעת ההתחלה",
    path: ["endTime"],
  });
export type ActivityInput = z.infer<typeof ActivityInput>;
