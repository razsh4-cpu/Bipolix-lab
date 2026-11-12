"use client";

import { useActionState, useState } from "react";
import { FormMessage, SelectField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/forms";
import { options, ROLE_LABELS } from "@/lib/labels";
import type { InvitationState } from "./actions";

const ROLE_HINT = "צופה: רואה הכל ולא משנה. מדריך: גם מדווח תקלות ורושם שימוש במלאי. מנהל: הכל.";

function mailtoHref(email: string, link: string, orgName: string) {
  const subject = `הזמנה להצטרף ל-LabOps – ${orgName}`;
  const body = [
    "שלום,",
    "",
    `הוזמנת להצטרף למערכת ניהול המעבדה של ${orgName}.`,
    "להשלמת ההרשמה ובחירת סיסמה יש להיכנס לקישור הבא:",
    link,
    "",
    "הקישור אישי, חד-פעמי ובתוקף ל-7 ימים.",
  ].join("\n");
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function InviteLink({ link, email, orgName }: { link: string; email: string; orgName: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-sm text-emerald-900">
        הקישור ל-<span dir="ltr">{email}</span> מוכן. הוא חד-פעמי ובתוקף ל-7 ימים, ומוצג רק עכשיו.
      </p>
      <input readOnly value={link} dir="ltr" aria-label="קישור ההזמנה" onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs" />
      <div className="flex flex-wrap gap-2">
        <a href={mailtoHref(email, link, orgName)} className={BUTTON_PRIMARY}>שליחה במייל</a>
        <button type="button" onClick={copy} className={BUTTON_SECONDARY}>{copied ? "הועתק ✓" : "העתקת הקישור"}</button>
      </div>
      <p className="text-xs text-slate-600">״שליחה במייל״ פותח את אפליקציית המייל שלך עם הודעה מוכנה. נשאר רק ללחוץ שליחה.</p>
    </div>
  );
}

export function InvitationForm({ action, orgName }: { action: (prev: InvitationState, formData: FormData) => Promise<InvitationState>; orgName: string }) {
  const [state, formAction, pending] = useActionState(action, initialActionState as InvitationState);
  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4" noValidate>
        {!state.link && <FormMessage state={state} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="email" label="מייל" type="email" dir="ltr" state={state} required />
          <SelectField name="role" label="תפקיד" state={state} required defaultValue="VIEWER" options={options(ROLE_LABELS)} hint={ROLE_HINT} />
        </div>
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>{pending ? "יוצר…" : "יצירת קישור הזמנה"}</button>
      </form>
      {state.ok && state.link && state.email && <InviteLink link={state.link} email={state.email} orgName={orgName} />}
    </div>
  );
}

export function AcceptInvitationForm({ action, email }: { action: (prev: ActionState, formData: FormData) => Promise<ActionState>; email: string }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <FormMessage state={state} />
      <div>
        <span className="block text-sm font-medium">מייל</span>
        <p className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-left" dir="ltr">{email}</p>
      </div>
      <TextField name="name" label="שם מלא" state={state} required />
      <TextField name="password" label="סיסמה" type="password" dir="ltr" state={state} required hint="לפחות 10 תווים" />
      <TextField name="confirmPassword" label="אימות סיסמה" type="password" dir="ltr" state={state} required />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full`}>{pending ? "יוצר חשבון…" : "הצטרפות"}</button>
    </form>
  );
}
