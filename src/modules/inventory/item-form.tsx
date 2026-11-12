"use client";

import { useActionState, useState } from "react";
import { FormMessage, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/forms";
import { ColorField } from "./color-field";
import { defaultUnitFor, isFilamentCategory } from "./schema";

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

// Kept short on purpose: name, category, quantity and (for filament) colour.
// Fields that are no longer shown keep their stored values through hidden
// inputs, because saving an item replaces every field.
export function InventoryItemForm({
  action,
  categories,
  defaultEquipmentId,
  item,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  labs?: { id: string; name: string }[];
  categories: string[];
  units?: string[];
  equipment?: { id: string; name: string }[];
  defaultEquipmentId?: string;
  item?: Item;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const v = (x: string | null | undefined) => x ?? undefined;
  const submittedCategory = state.values?.category;
  const [category, setCategory] = useState(typeof submittedCategory === "string" ? submittedCategory : (item?.category ?? ""));
  const showColor = isFilamentCategory(category) || Boolean(item?.color);
  const machineIds = item?.equipmentIds ?? (defaultEquipmentId ? [defaultEquipmentId] : []);
  const kept: [string, string | null | undefined][] = item
    ? [
        ["unit", item.unit],
        ["labId", item.labId],
        ["minStockLevel", item.minStockLevel],
        ["storageLocation", item.storageLocation],
        ["supplier", item.supplier],
        ["unitCost", item.unitCost],
        ["quickStep", item.quickStep],
        ["notes", item.notes],
      ]
    : [["unit", defaultUnitFor(category)]];

  return (
    <form
      action={formAction}
      className="space-y-6"
      noValidate
      onInput={(e) => {
        const t = e.target as HTMLInputElement;
        if (t.name === "category") setCategory(t.value);
      }}
    >
      <FormMessage state={state} />
      {kept.map(([name, value]) => value != null && value !== "" && <input key={name} type="hidden" name={name} value={value} />)}
      {machineIds.map((id) => <input key={id} type="hidden" name="equipmentIds" value={id} />)}
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
        {!item && (
          <TextField name="initialQuantity" label="כמות" state={state} inputMode="decimal" dir="ltr" hint={isFilamentCategory(category) ? "מספר גלילים" : undefined} />
        )}
        {showColor && <ColorField state={state} defaultValue={item?.color} />}
      </div>
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}
