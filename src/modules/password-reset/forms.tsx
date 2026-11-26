"use client";

import { useActionState, useState } from "react";
import { FormMessage, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/forms";
import type { ResetLinkState } from "./actions";

function messageText(link: string) {
  return [
    "שלום,",
    "",
    "לבחירת סיסמה חדשה ל-LabOps יש להיכנס לקישור הבא:",
    link,
    "",
    "הקישור אישי, חד-פעמי ובתוקף ל-24 שעות.",
  ].join("\n");
}

function ResetLink({ link, email }: { link: string; email: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  const text = messageText(link);
  const mailto = `mailto:${email}?subject=${encodeURIComponent("איפוס סיסמה ל-LabOps")}&body=${encodeURIComponent(text)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return (
    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-sm text-emerald-900">
        הקישור ל-<span dir="ltr">{email}</span> מוכן. הוא חד-פעמי ובתוקף ל-24 שעות, ומוצג רק עכשיו.
      </p>
      <input readOnly value={link} dir="ltr" aria-label="קישור האיפוס" onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs" />
      <div className="flex flex-wrap gap-2">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={BUTTON_PRIMARY}>שליחה בוואטסאפ</a>
        <a href={mailto} className={BUTTON_SECONDARY}>שליחה במייל</a>
        <button type="button" onClick={copy} className={BUTTON_SECONDARY}>{copied ? "הועתק ✓" : "העתקת הקישור"}</button>
      </div>
    </div>
  );
}

export function ResetLinkForm({ action }: { action: (prev: ResetLinkState, formData: FormData) => Promise<ResetLinkState> }) {
  const [state, formAction, pending] = useActionState(action, initialActionState as ResetLinkState);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">יוצרים קישור ושולחים לאדם. הוא בוחר סיסמה חדשה בעצמו, והסיסמה הישנה מפסיקה לעבוד.</p>
      <form action={formAction}>
        {!state.link && <FormMessage state={state} />}
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>{pending ? "יוצר…" : state.link ? "יצירת קישור חדש" : "יצירת קישור איפוס"}</button>
      </form>
      {state.ok && state.link && state.email && <ResetLink link={state.link} email={state.email} />}
    </div>
  );
}

export function NewPasswordForm({ action, email }: { action: (prev: ActionState, formData: FormData) => Promise<ActionState>; email: string }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <FormMessage state={state} />
      <div>
        <span className="block text-sm font-medium">מייל</span>
        <p className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-left" dir="ltr">{email}</p>
      </div>
      <TextField name="password" label="סיסמה חדשה" type="password" dir="ltr" state={state} required hint="לפחות 10 תווים" />
      <TextField name="confirmPassword" label="אימות סיסמה" type="password" dir="ltr" state={state} required />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full`}>{pending ? "שומר…" : "שמירת סיסמה חדשה"}</button>
    </form>
  );
}
