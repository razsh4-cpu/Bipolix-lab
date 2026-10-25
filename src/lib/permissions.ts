import type { MemberRole } from "@/generated/prisma/enums";

// Single source of truth for what each role may do inside an organization.
// Every server action and route handler must check one of these.
export const PERMISSIONS = {
  "dashboard.view": ["ADMIN", "INSTRUCTOR", "VIEWER"],
  "equipment.view": ["ADMIN", "INSTRUCTOR", "VIEWER"],
  "equipment.manage": ["ADMIN"],
  "equipment.returnToService": ["ADMIN"],
  "inventory.view": ["ADMIN", "INSTRUCTOR", "VIEWER"],
  "inventory.manage": ["ADMIN"],
  "inventory.receive": ["ADMIN"],
  "inventory.adjust": ["ADMIN"],
  "inventory.issue": ["ADMIN", "INSTRUCTOR"],
  "fault.report": ["ADMIN", "INSTRUCTOR"],
  "fault.manage": ["ADMIN"],
  "maintenance.record": ["ADMIN"],
  "task.manage": ["ADMIN"],
  "procedure.view": ["ADMIN", "INSTRUCTOR", "VIEWER"],
  "procedure.manage": ["ADMIN"],
  "task.updateOwn": ["ADMIN", "INSTRUCTOR"],
  "users.manage": ["ADMIN"],
  "settings.manage": ["ADMIN"],
  "audit.view": ["ADMIN"],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: MemberRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly MemberRole[]).includes(role);
}
