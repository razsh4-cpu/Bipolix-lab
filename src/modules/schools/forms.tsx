"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/forms";
import { PRINT_REQUEST_STATUS_LABELS, options } from "@/lib/labels";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function SchoolForm({ action, name, submitLabel }: { action: Action; name?: string; submitLabel: string }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField name="name" label="שם בית הספר" state={state} required defaultValue={name} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>{pending ? "שומר…" : submitLabel}</button>
    </form>
  );
}

type PrintRequest = { schoolId: string; description: string; quantity: number | null; filesUrl: string | null; status: string };

export function PrintRequestForm({
  action,
  schools,
  request,
  submitLabel,
}: {
  action: Action;
  schools: { id: string; name: string }[];
  request?: Partial<PrintRequest>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <SelectField
        name="schoolId"
        label="בית ספר"
        state={state}
        required
        defaultValue={request?.schoolId}
        placeholder="בחירה…"
        options={schools.map((s) => ({ value: s.id, label: s.name }))}
      />
      <TextAreaField name="description" label="מה להדפיס" rows={3} state={state} required defaultValue={request?.description} />
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <TextField name="quantity" label="כמות" inputMode="numeric" state={state} defaultValue={request?.quantity ?? undefined} />
        <TextField name="filesUrl" label="קישור לקבצי התלת־ממד" dir="ltr" state={state} defaultValue={request?.filesUrl ?? undefined} hint="למשל קישור לתיקייה ב־Google Drive" />
      </div>
      <SelectField name="status" label="סטטוס" state={state} required defaultValue={request?.status ?? "PENDING"} options={options(PRINT_REQUEST_STATUS_LABELS)} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>{pending ? "שומר…" : submitLabel}</button>
    </form>
  );
}
