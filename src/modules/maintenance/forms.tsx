"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/ui";
import type { FaultSeverity, FaultStatus } from "@/generated/prisma/enums";
import { initialActionState, type ActionState } from "@/lib/forms";
import { FAULT_SEVERITY_LABELS, FAULT_STATUS_LABELS, MAINTENANCE_TYPE_LABELS, options, PLAN_SOURCE_LABELS } from "@/lib/labels";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type Option = { id: string; name: string };

const SEVERITY_STYLE: Record<FaultSeverity, string> = {
  LOW: "has-[:checked]:border-slate-600 has-[:checked]:bg-slate-100",
  MEDIUM: "has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50",
  HIGH: "has-[:checked]:border-orange-600 has-[:checked]:bg-orange-50",
  CRITICAL: "has-[:checked]:border-red-600 has-[:checked]:bg-red-50",
};

export function FaultReportForm({ action, equipment, equipmentId }: { action: Action; equipment: Option[]; equipmentId?: string }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const severityErrors = state.fieldErrors?.severity;
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <SelectField
        name="equipmentId"
        label="ציוד"
        state={state}
        required
        defaultValue={equipmentId}
        placeholder="בחירת ציוד"
        options={equipment.map((e) => ({ value: e.id, label: e.name }))}
      />
      <fieldset>
        <legend className="text-sm font-medium">
          חומרה<span className="text-red-600"> *</span>
        </legend>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(FAULT_SEVERITY_LABELS) as FaultSeverity[]).map((s) => (
            <label key={s} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-300 ${SEVERITY_STYLE[s]}`}>
              <input type="radio" name="severity" value={s} className="sr-only" />
              {FAULT_SEVERITY_LABELS[s]}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">תקלה קריטית משביתה את הציוד עד בדיקה של גורם מוסמך.</p>
        {severityErrors?.map((e) => (
          <p key={e} className="mt-1 text-sm text-red-700">{e}</p>
        ))}
      </fieldset>
      <TextAreaField name="description" label="מה קרה?" state={state} required rows={4} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שולח…" : "שליחת דיווח"}
      </button>
    </form>
  );
}

export function FaultStatusForm({ action, current }: { action: Action; current: FaultStatus }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-3">
      <SelectField name="status" label="סטטוס התקלה" state={state} defaultValue={current} options={options(FAULT_STATUS_LABELS)} />
      <p className="text-xs text-slate-500">סגירת התקלה לא מחזירה את הציוד לפעילות. את סטטוס הציוד משנים בכרטיס הציוד.</p>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={BUTTON_SECONDARY}>
        {pending ? "מעדכן…" : "עדכון"}
      </button>
    </form>
  );
}

export function MaintenanceRecordForm({
  action,
  equipment,
  plans,
  defaults,
}: {
  action: Action;
  equipment: Option[];
  plans: { id: string; title: string; equipmentName: string }[];
  defaults: { equipmentId?: string; faultReportId?: string; today: string };
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {defaults.faultReportId && <input type="hidden" name="faultReportId" value={defaults.faultReportId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="equipmentId"
          label="ציוד"
          state={state}
          required
          defaultValue={defaults.equipmentId}
          placeholder="בחירת ציוד"
          options={equipment.map((e) => ({ value: e.id, label: e.name }))}
        />
        <SelectField name="type" label="סוג טיפול" state={state} required placeholder="בחירה" defaultValue={defaults.faultReportId ? "CORRECTIVE" : undefined} options={options(MAINTENANCE_TYPE_LABELS)} />
        <TextField name="performedAt" label="תאריך ביצוע" type="date" state={state} required defaultValue={defaults.today} />
        {plans.length > 0 && (
          <SelectField
            name="planId"
            label="במסגרת תוכנית תחזוקה"
            state={state}
            placeholder="לא קשור לתוכנית"
            options={plans.map((p) => ({ value: p.id, label: `${p.equipmentName} · ${p.title}` }))}
            hint="מועד הטיפול הבא בתוכנית יתעדכן אוטומטית"
          />
        )}
      </div>
      <TextAreaField name="description" label="מה בוצע" state={state} required />
      <TextField name="partsReplaced" label="חלקים שהוחלפו" state={state} />
      <TextAreaField name="notes" label="הערות" state={state} rows={2} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : "שמירת טיפול"}
      </button>
    </form>
  );
}

export function MaintenancePlanForm({ action, equipment, equipmentId }: { action: Action; equipment: Option[]; equipmentId?: string }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="equipmentId"
          label="ציוד"
          state={state}
          required
          defaultValue={equipmentId}
          placeholder="בחירת ציוד"
          options={equipment.map((e) => ({ value: e.id, label: e.name }))}
        />
        <TextField name="title" label="שם הטיפול" state={state} required />
        <TextField name="nextDueAt" label="מועד הטיפול הבא" type="date" state={state} required />
        <TextField name="intervalDays" label="חוזר כל (ימים)" state={state} inputMode="numeric" dir="ltr" hint="ריק = טיפול חד-פעמי" />
        <SelectField name="source" label="מקור ההגדרה" state={state} required placeholder="בחירה" options={options(PLAN_SOURCE_LABELS)} />
        <TextField name="sourceNote" label="הפניה למקור" state={state} hint="למשל: עמוד במדריך היצרן" />
      </div>
      <p className="text-sm text-slate-600">יש להזין מרווחי טיפול רק לפי הוראות היצרן או החלטה של מנהל מוסמך.</p>
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : "שמירת תוכנית"}
      </button>
    </form>
  );
}
