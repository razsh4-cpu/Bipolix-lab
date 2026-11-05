"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/ui";
import type { MemberRole } from "@/generated/prisma/enums";
import { initialActionState, type ActionState } from "@/lib/forms";
import { options, ROLE_LABELS } from "@/lib/labels";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const ROLE_HINT = "צופה: רואה הכל ולא משנה. מדריך: גם מדווח תקלות ורושם שימוש במלאי. מנהל: הכל.";

export function NewMemberForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="שם" state={state} required />
        <TextField name="email" label="מייל" type="email" dir="ltr" state={state} required />
        <SelectField name="role" label="תפקיד" state={state} required defaultValue="VIEWER" options={options(ROLE_LABELS)} hint={ROLE_HINT} />
        <TextField name="password" label="סיסמה ראשונית" type="text" dir="ltr" state={state} required hint="לפחות 10 תווים. מסור אותה לאדם ישירות." />
      </div>
      <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>{pending ? "שומר…" : "הוספה"}</button>
    </form>
  );
}

export function MemberForm({ action, role, isActive, isSelf }: { action: Action; role: MemberRole; isActive: boolean; isSelf: boolean }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <SelectField name="role" label="תפקיד" state={state} defaultValue={role} options={options(ROLE_LABELS)} hint={ROLE_HINT} />
      <SelectField
        name="isActive"
        label="גישה"
        state={state}
        defaultValue={String(isActive)}
        options={[{ value: "true", label: "פעיל" }, { value: "false", label: "מושבת (לא יכול להתחבר)" }]}
      />
      {isSelf && <p className="text-sm text-slate-600">זה המשתמש שלך. אי אפשר לשנות לו תפקיד או להשבית אותו.</p>}
      <button type="submit" disabled={pending || isSelf} className={BUTTON_SECONDARY}>{pending ? "שומר…" : "שמירה"}</button>
    </form>
  );
}

export function PasswordResetForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <TextField name="password" label="סיסמה חדשה" type="text" dir="ltr" state={state} hint="לפחות 10 תווים" />
      <button type="submit" disabled={pending} className={BUTTON_SECONDARY}>{pending ? "מחליף…" : "החלפת סיסמה"}</button>
    </form>
  );
}
