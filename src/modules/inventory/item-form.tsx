"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/forms";
import { ColorField } from "./color-field";

type Item = {
  name: string;
  category: string;
  color: string | null;
  unit: string;
  labId: string | null;
  minStockLevel: string | null;
  storageLocation: string | null;
  supplier: string | null;
  unitCost: string | null;
  quickStep: string;
  equipmentIds: string[];
  notes: string | null;
};

export function InventoryItemForm({
  action,
  labs,
  categories,
  units,
  equipment,
  defaultEquipmentId,
  item,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  labs: { id: string; name: string }[];
  categories: string[];
  units: string[];
  equipment: { id: string; name: string }[];
  defaultEquipmentId?: string;
  item?: Item;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const v = (x: string | null | undefined) => x ?? undefined;
  const submitted = state.values?.equipmentIds;
  const checkedMachines = state.values
    ? (Array.isArray(submitted) ? submitted : submitted ? [submitted] : [])
    : (item?.equipmentIds ?? (defaultEquipmentId ? [defaultEquipmentId] : []));

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
        <ColorField state={state} defaultValue={item?.color} />
        <div>
          <TextField name="unit" label="יחידת מידה" state={state} required list="inventory-units" defaultValue={v(item?.unit)} hint="למשל: יח', גליל, גרם, לוח" />
          <datalist id="inventory-units">
            {units.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
        {!item && (
          <TextField name="initialQuantity" label="כמות התחלתית" state={state} inputMode="decimal" dir="ltr" hint="נרשמת כתנועת קליטה. אפשר להשאיר ריק" />
        )}
        <TextField name="minStockLevel" label="סף מינימום" state={state} inputMode="decimal" dir="ltr" defaultValue={v(item?.minStockLevel)} hint="מתחתיו תוצג התראה. ריק = ללא התראה" />
        <TextField name="quickStep" label="כמות לכל לחיצה בהזנה מהירה" state={state} inputMode="decimal" dir="ltr" defaultValue={item?.quickStep ?? "1"} hint="למשל 1 גליל, או 50 גרם" />
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
      {equipment.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">משמש למכונות</legend>
          <div className="flex flex-wrap gap-2">
            {equipment.map((e) => (
              <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                <input
                  type="checkbox"
                  name="equipmentIds"
                  value={e.id}
                  defaultChecked={checkedMachines.includes(e.id)}
                />
                {e.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <TextAreaField name="notes" label="הערות" state={state} defaultValue={v(item?.notes)} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}
