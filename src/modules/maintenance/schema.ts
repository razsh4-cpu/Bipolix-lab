import { z } from "zod";
import { FaultSeverity, FaultStatus, MaintenanceType, PlanSource } from "@/generated/prisma/enums";
import { optionalText, requiredDate, requiredText } from "@/lib/forms";

export const FaultReportInput = z.object({
  equipmentId: z.string({ error: "יש לבחור ציוד" }).min(1, "יש לבחור ציוד"),
  severity: z.enum(FaultSeverity, { error: "יש לבחור חומרה" }),
  description: requiredText(2000),
});
export type FaultReportInput = z.infer<typeof FaultReportInput>;

export const FaultStatusInput = z.object({
  status: z.enum(FaultStatus, { error: "סטטוס לא תקין" }),
});
export type FaultStatusInput = z.infer<typeof FaultStatusInput>;

export const MaintenanceRecordInput = z.object({
  equipmentId: z.string({ error: "יש לבחור ציוד" }).min(1, "יש לבחור ציוד"),
  faultReportId: z.string().optional(),
  planId: z.string().optional(),
  type: z.enum(MaintenanceType, { error: "יש לבחור סוג טיפול" }),
  description: requiredText(2000),
  performedAt: requiredDate,
  partsReplaced: optionalText(500),
  notes: optionalText(2000),
});
export type MaintenanceRecordInput = z.infer<typeof MaintenanceRecordInput>;

export const MaintenancePlanInput = z.object({
  equipmentId: z.string({ error: "יש לבחור ציוד" }).min(1, "יש לבחור ציוד"),
  title: requiredText(160),
  nextDueAt: requiredDate,
  intervalDays: z.coerce.number({ error: "מספר ימים" }).int("מספר שלם").min(1, "לפחות יום אחד").max(3650).optional(),
  source: z.enum(PlanSource, { error: "חובה לציין את מקור ההגדרה" }),
  sourceNote: optionalText(300),
});
export type MaintenancePlanInput = z.infer<typeof MaintenancePlanInput>;
