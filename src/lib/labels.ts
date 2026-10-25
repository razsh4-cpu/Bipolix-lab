import type { EquipmentStatus, MemberRole } from "@/generated/prisma/enums";

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
