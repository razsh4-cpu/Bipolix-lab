"use client";

import { useActionState, useState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, toDateInput, type ActionState } from "@/lib/forms";
import { EQUIPMENT_PROCUREMENT_LABELS, options } from "@/lib/labels";

type Equipment = {
  name: string;
  category: string;
  procurement: string;
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
  // "נדרש לרכישה" shows only what matters for buying: category, model, notes.
  // Other fields stay in the DOM (just hidden) so their saved values are kept.
  const [stage, setStage] = useState(
    (typeof state.values?.procurement === "string" && state.values.procurement) || equipment?.procurement || "IN_SERVICE",
  );
  const toPurchase = stage === "TO_ORDER";
  const hide = toPurchase ? "hidden" : undefined;

  return (
    <form
      action={formAction}
      className="space-y-6"
      noValidate
      onChange={(e) => {
        const t = e.target as unknown as HTMLSelectElement;
        if (t.name === "procurement") setStage(t.value);
      }}
    >
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={hide}>
          <TextField name="name" label="שם" state={state} required defaultValue={v(equipment?.name)} />
        </div>
        <div>
          <TextField
            name="category"
            label="קטגוריה"
            state={state}
            required
            defaultValue={v(equipment?.category)}
            list="category-options"
            hint="בחירה מהרשימה או הקלדת קטגוריה חדשה"
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <SelectField
          name="procurement"
          label="מצב רכש"
          state={state}
          required
          defaultValue={equipment?.procurement ?? "IN_SERVICE"}
          options={options(EQUIPMENT_PROCUREMENT_LABELS)}
          hint={toPurchase ? "בשלב זה מוצגים רק פרטי הרכישה: קטגוריה, דגם והערות" : "ציוד בהזמנה או נדרש לרכישה לא מופיע בלוח המכונות עד שיסומן כקיים"}
        />
        {labs.length > 0 && (
          <div className={hide}>
            <SelectField
              name="labId"
              label="מעבדה"
              state={state}
              defaultValue={v(equipment?.labId)}
              placeholder="ללא שיוך"
              options={labs.map((l) => ({ value: l.id, label: l.name }))}
            />
          </div>
        )}
        <div className={hide}><TextField name="location" label="מיקום" state={state} defaultValue={v(equipment?.location)} /></div>
        <div className={hide}><TextField name="manufacturer" label="יצרן" state={state} defaultValue={v(equipment?.manufacturer)} /></div>
        <TextField name="model" label="דגם" state={state} defaultValue={v(equipment?.model)} />
        <div className={hide}><TextField name="serialNumber" label="מספר סידורי" dir="ltr" state={state} defaultValue={v(equipment?.serialNumber)} /></div>
        <div className={hide}><TextField name="purchaseDate" label="תאריך רכישה" type="date" state={state} defaultValue={toDateInput(equipment?.purchaseDate)} /></div>
        <div className={hide}><TextField name="warrantyExpiresAt" label="תום אחריות" type="date" state={state} defaultValue={toDateInput(equipment?.warrantyExpiresAt)} /></div>
      </div>
      <div className={hide}><TextAreaField name="safetyInstructions" label="הוראות בטיחות" rows={4} state={state} defaultValue={v(equipment?.safetyInstructions)} hint="רק לפי הוראות יצרן או נוהל מאושר" /></div>
      <TextAreaField name="notes" label="הערות" state={state} defaultValue={v(equipment?.notes)} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}
