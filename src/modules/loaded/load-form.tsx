"use client";

import { useActionState } from "react";
import { FormMessage, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/forms";
import { SLOT_SUGGESTIONS } from "./schema";

type Option = { id: string; name: string };

export function LoadMaterialForm({
  action,
  linked,
  others,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  linked: Option[];
  others: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const errors = state.fieldErrors?.itemId;
  return (
    <form action={formAction} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="itemId" className="block text-sm font-medium">חומר<span className="text-red-600"> *</span></label>
          <select id="itemId" name="itemId" defaultValue="" required aria-invalid={Boolean(errors)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">בחירה…</option>
            {linked.length > 0 && (
              <optgroup label="מקושרים למכונה">
                {linked.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </optgroup>
            )}
            {others.length > 0 && (
              <optgroup label="שאר המלאי">
                {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </optgroup>
            )}
          </select>
          {errors?.map((e) => <p key={e} className="mt-1 text-sm text-red-700">{e}</p>)}
        </div>
        <div>
          <TextField name="slot" label="מיקום במכונה" state={state} list="slot-suggestions" dir="ltr" hint="למשל AMS 1 · 2. אפשר להשאיר ריק" />
          <datalist id="slot-suggestions">
            {SLOT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>
      <p className="text-xs text-slate-500">אם כבר יש חומר באותו מיקום, הוא יוחלף בחדש.</p>
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : "סימון כטעון"}
      </button>
    </form>
  );
}
