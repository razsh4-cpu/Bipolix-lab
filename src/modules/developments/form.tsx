"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, toDateInput, type ActionState } from "@/lib/forms";
import { DEVELOPMENT_STATUS_LABELS, options } from "@/lib/labels";

type Development = { title: string; description: string | null; status: string; owner: string | null; targetDate: Date | null };

export function DevelopmentForm({
  action,
  development,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  development?: Development;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const v = (x: string | null | undefined) => x ?? undefined;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField name="title" label="שם הפיתוח" state={state} required defaultValue={v(development?.title)} hint="למשל: עמדת רובוטיקה חדשה במשאית" />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField name="status" label="סטטוס" state={state} required defaultValue={development?.status ?? "IN_PROGRESS"} options={options(DEVELOPMENT_STATUS_LABELS)} />
        <TextField name="owner" label="אחראי" state={state} defaultValue={v(development?.owner)} />
        <TextField name="targetDate" label="תאריך יעד" type="date" state={state} defaultValue={toDateInput(development?.targetDate)} />
      </div>
      <TextAreaField name="description" label="תיאור ומצב נוכחי" rows={4} state={state} defaultValue={v(development?.description)} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>{pending ? "שומר…" : submitLabel}</button>
    </form>
  );
}
