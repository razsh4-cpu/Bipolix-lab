"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formToObject, validationError, type ActionState } from "@/lib/forms";
import type { Permission } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { DomainError } from "@/modules/types";
import { FaultReportInput, FaultUpdateInput, MaintenancePlanInput, MaintenanceRecordInput } from "./schema";
import { createMaintenancePlan, deactivateMaintenancePlan, recordMaintenance, reportFault, updateFault } from "./service";

async function actor(permission: Permission) {
  const ctx = await requirePermission(permission);
  return { organizationId: ctx.organization.id, userId: ctx.user.id };
}

function domainFailure(error: unknown): ActionState {
  if (error instanceof DomainError) return { ok: false, message: error.message };
  throw error;
}

export async function reportFaultAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("fault.report");
  const parsed = FaultReportInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  let id: string;
  try {
    id = (await reportFault(db, who, parsed.data)).id;
  } catch (error) {
    return domainFailure(error);
  }
  redirect(`/maintenance/faults/${id}`);
}

export async function updateFaultAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("fault.manage");
  const parsed = FaultUpdateInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await updateFault(db, who, id, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  refresh();
  return { ok: true, message: "התקלה עודכנה" };
}

export async function recordMaintenanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("maintenance.record");
  const parsed = MaintenanceRecordInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await recordMaintenance(db, who, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect(parsed.data.faultReportId ? `/maintenance/faults/${parsed.data.faultReportId}` : `/equipment/${parsed.data.equipmentId}`);
}

export async function createMaintenancePlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const who = await actor("maintenance.record");
  const parsed = MaintenancePlanInput.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await createMaintenancePlan(db, who, parsed.data);
  } catch (error) {
    return domainFailure(error);
  }
  redirect("/maintenance");
}

export async function deactivateMaintenancePlanAction(id: string): Promise<void> {
  const who = await actor("maintenance.record");
  await deactivateMaintenancePlan(db, who, id);
  refresh();
}
