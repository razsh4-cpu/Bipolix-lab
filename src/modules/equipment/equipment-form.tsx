"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, toDateInput, type ActionState } from "@/lib/forms";

type Equipment = {
  name: string;
  category: string;
  labId: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  purchaseDate: Date | null;
  warrantyExpiresAt: Date | null;
  notes: string | null;
  safetyInstructions: string | null;
};

export function EquipmentForm({
  action,
  labs,
  categories,
  equipment,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  labs: { id: string; name: string }[];
  categories: string[];
  equipment?: Equipment;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const v = (x: string | null | undefined) => x ?? undefined;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="שם" state={state} required defaultValue={v(equipment?.name)} />
        <div>
          <TextField
            name="category"
            label="קטגוריה"
            state={state}
            required
            defaultValue={v(equipment?.category)}
            list="category-options"
            hint="למשל: CNC, חיתוך לייזר, מדפסת תלת-ממד"
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        {labs.length > 0 && (
          <SelectField
            name="labId"
            label="מעבדה"
            state={state}
            defaultValue={v(equipment?.labId)}
            placeholder="ללא שיוך"
            options={labs.map((l) => ({ value: l.id, label: l.name }))}
          />
        )}
        <TextField name="location" label="מיקום" state={state} defaultValue={v(equipment?.location)} />
        <TextField name="manufacturer" label="יצרן" state={state} defaultValue={v(equipment?.manufacturer)} />
        <TextField name="model" label="דגם" state={state} defaultValue={v(equipment?.model)} />
        <TextField name="serialNumber" label="מספר סידורי" dir="ltr" state={state} defaultValue={v(equipment?.serialNumber)} />
        <TextField name="purchaseDate" label="תאריך רכישה" type="date" state={state} defaultValue={toDateInput(equipment?.purchaseDate)} />
        <TextField name="warrantyExpiresAt" label="תום אחריות" type="date" state={state} defaultValue={toDateInput(equipment?.warrantyExpiresAt)} />
      </div>
      <TextAreaField name="safetyInstructions" label="הוראות בטיחות" rows={4} state={state} defaultValue={v(equipment?.safetyInstructions)} hint="רק לפי הוראות יצרן או נוהל מאושר" />
      <TextAreaField name="notes" label="הערות" state={state} defaultValue={v(equipment?.notes)} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}
