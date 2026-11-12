"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/ui";
import type { SuggestionStatus } from "@/generated/prisma/enums";
import { initialActionState, type ActionState } from "@/lib/forms";
import { options, SUGGESTION_STATUS_LABELS } from "@/lib/labels";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function SuggestionForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField name="title" label="ההצעה בקצרה" state={state} required hint="למשל: להציג בדשבורד מתי הוחלף פילמנט לאחרונה" />
      <TextAreaField name="details" label="פירוט (לא חובה)" rows={3} state={state} hint="מה הבעיה היום, ואיך השינוי יעזור" />
      <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>{pending ? "שולח…" : "שליחת הצעה"}</button>
    </form>
  );
}

export function SuggestionReviewForm({ action, status, adminResponse }: { action: Action; status: SuggestionStatus; adminResponse: string | null }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <SelectField name="status" label="סטטוס" state={state} defaultValue={status} options={options(SUGGESTION_STATUS_LABELS)} />
        <TextField name="adminResponse" label="תגובה למציע" state={state} defaultValue={adminResponse ?? undefined} />
      </div>
      <button type="submit" disabled={pending} className={BUTTON_SECONDARY}>{pending ? "שומר…" : "עדכון"}</button>
    </form>
  );
}
