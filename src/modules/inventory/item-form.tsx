"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/forms";

type Item = {
  name: string;
  category: string;
  unit: string;
  labId: string | null;
  minStockLevel: string | null;
  storageLocation: string | null;
  supplier: string | null;
  unitCost: string | null;
  notes: string | null;
};

export function InventoryItemForm({
  action,
  labs,
  categories,
  item,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  labs: { id: string; name: string }[];
  categories: string[];
  item?: Item;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const v = (x: string | null | undefined) => x ?? undefined;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="שם הפריט" state={state} required defaultValue={v(item?.name)} />
        <div>
          <TextField name="category" label="קטגוריה" state={state} required list="inventory-categories" defaultValue={v(item?.category)} />
          <datalist id="inventory-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <TextField name="unit" label="יחידת מידה" state={state} required defaultValue={v(item?.unit)} hint="למשל: יח', מ״ר, ק״ג, גליל" />
        {!item && (
          <TextField name="initialQuantity" label="כמות התחלתית" state={state} inputMode="decimal" dir="ltr" hint="נרשמת כתנועת קליטה. אפשר להשאיר ריק" />
        )}
        <TextField name="minStockLevel" label="סף מינימום" state={state} inputMode="decimal" dir="ltr" defaultValue={v(item?.minStockLevel)} hint="מתחתיו תוצג התראה. ריק = ללא התראה" />
        <TextField name="storageLocation" label="מיקום אחסון" state={state} defaultValue={v(item?.storageLocation)} />
        <TextField name="supplier" label="ספק" state={state} defaultValue={v(item?.supplier)} />
        <TextField name="unitCost" label="מחיר ליחידה (₪)" state={state} inputMode="decimal" dir="ltr" defaultValue={v(item?.unitCost)} />
        {labs.length > 0 && (
          <SelectField
            name="labId"
            label="מעבדה"
            state={state}
            defaultValue={v(item?.labId)}
            placeholder="ללא שיוך"
            options={labs.map((l) => ({ value: l.id, label: l.name }))}
          />
        )}
      </div>
      <TextAreaField name="notes" label="הערות" state={state} defaultValue={v(item?.notes)} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}
