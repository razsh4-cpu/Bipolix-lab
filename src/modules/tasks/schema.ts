import { z } from "zod";
import { TaskPriority, TaskStatus } from "@/generated/prisma/enums";
import { optionalDate, optionalText, requiredText } from "@/lib/forms";

export const TaskInput = z.object({
  title: requiredText(160),
  description: optionalText(4000),
  assigneeId: z.string().optional(),
  priority: z.enum(TaskPriority, { error: "עדיפות לא תקינה" }).default("MEDIUM"),
  status: z.enum(TaskStatus, { error: "סטטוס לא תקין" }).default("TODO"),
  dueDate: optionalDate,
  equipmentId: z.string().optional(),
  notes: optionalText(2000),
});
export type TaskInput = z.infer<typeof TaskInput>;

export const TaskStatusInput = z.object({ status: z.enum(TaskStatus, { error: "סטטוס לא תקין" }) });
export type TaskStatusInput = z.infer<typeof TaskStatusInput>;
