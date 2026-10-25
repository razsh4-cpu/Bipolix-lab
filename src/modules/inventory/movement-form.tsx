"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { FormMessage, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/forms";

type MovementType = "RECEIVE" | "ISSUE" | "ADJUST";

const TYPE_TEXT: Record<MovementType, { label: string; quantity: string; reason: string }> = {
  ISSUE: { label: "הוצאה", quantity: "כמות שהוצאה", reason: "סיבה / פעילות (רשות)" },
  RECEIVE: { label: "קליטה", quantity: "כמות שנקלטה", reason: "הערה, למשל ספק או חשבונית (רשות)" },
  ADJUST: { label: "התאמת ספירה", quantity: "הכמות שנספרה בפועל", reason: "סיבת ההתאמה" },
};

export function StockMovementForm({
  action,
  allowed,
  unit,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  allowed: MovementType[];
  unit: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [type, setType] = useState<MovementType>(allowed[0]);
  const formRef = useRef<HTMLFormElement>(null);
  const text = TYPE_TEXT[type];

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <fieldset>
        <legend className="text-sm font-medium">סוג תנועה</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {allowed.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50">
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} />
              {TYPE_TEXT[t].label}
            </label>
          ))}
        </div>
      </fieldset>
      <TextField key={`q-${type}`} name="quantity" label={`${text.quantity} (${unit})`} state={state} required inputMode="decimal" dir="ltr" />
      <TextField key={`r-${type}`} name="reason" label={text.reason} state={state} required={type === "ADJUST"} />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full`}>
        {pending ? "רושם…" : `רישום ${text.label}`}
      </button>
    </form>
  );
}
