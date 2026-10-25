import type { BadgeTone } from "@/components/ui";
import type {
  ProcedureKind,
  EquipmentStatus,
  FaultSeverity,
  FaultStatus,
  InventoryTransactionType,
  MaintenanceType,
  MemberRole,
  PlanSource,
  TaskPriority,
  TaskStatus,
} from "@/generated/prisma/enums";

export const ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: "מנהל",
  INSTRUCTOR: "מדריך",
  VIEWER: "צופה",
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  OPERATIONAL: "תקין",
  LIMITED_OPERATION: "פעילות מוגבלת",
  UNDER_MAINTENANCE: "בטיפול",
  OUT_OF_SERVICE: "מושבת",
};

export const EQUIPMENT_STATUS_TONES: Record<EquipmentStatus, BadgeTone> = {
  OPERATIONAL: "green",
  LIMITED_OPERATION: "amber",
  UNDER_MAINTENANCE: "orange",
  OUT_OF_SERVICE: "red",
};

export const FAULT_SEVERITY_LABELS: Record<FaultSeverity, string> = {
  LOW: "נמוכה",
  MEDIUM: "בינונית",
  HIGH: "גבוהה",
  CRITICAL: "קריטית",
};

export const FAULT_SEVERITY_TONES: Record<FaultSeverity, BadgeTone> = {
  LOW: "slate",
  MEDIUM: "amber",
  HIGH: "orange",
  CRITICAL: "red",
};

export const FAULT_STATUS_LABELS: Record<FaultStatus, string> = {
  OPEN: "פתוחה",
  IN_PROGRESS: "בטיפול",
  WAITING_FOR_PARTS: "ממתינה לחלקים",
  RESOLVED: "טופלה",
  CLOSED: "סגורה",
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVE: "תחזוקה מונעת",
  CORRECTIVE: "תיקון",
  INSPECTION: "בדיקה",
};

export const PLAN_SOURCE_LABELS: Record<PlanSource, string> = {
  MANUFACTURER: "הוראות יצרן",
  ADMIN: "הגדרת מנהל",
};

export const INVENTORY_TX_LABELS: Record<InventoryTransactionType, string> = {
  RECEIVE: "קליטה",
  ISSUE: "הוצאה",
  ADJUST: "התאמה",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "לביצוע",
  IN_PROGRESS: "בביצוע",
  BLOCKED: "חסומה",
  COMPLETED: "הושלמה",
};

export const TASK_STATUS_TONES: Record<TaskStatus, BadgeTone> = {
  TODO: "slate",
  IN_PROGRESS: "blue",
  BLOCKED: "red",
  COMPLETED: "green",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "נמוכה",
  MEDIUM: "רגילה",
  HIGH: "גבוהה",
  URGENT: "דחופה",
};

export const TASK_PRIORITY_TONES: Record<TaskPriority, BadgeTone> = {
  LOW: "slate",
  MEDIUM: "blue",
  HIGH: "orange",
  URGENT: "red",
};

export function options<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export const PROCEDURE_KIND_LABELS: Record<ProcedureKind, string> = {
  SAFETY: "בטיחות",
  OPERATION: "הפעלה",
  MAINTENANCE: "תחזוקה",
  GENERAL: "כללי",
};
export const PROCEDURE_KIND_TONES: Record<ProcedureKind, BadgeTone> = {
  SAFETY: "red",
  OPERATION: "blue",
  MAINTENANCE: "orange",
  GENERAL: "slate",
};
