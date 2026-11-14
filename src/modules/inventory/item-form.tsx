"use client";

import { useActionState, useState } from "react";
import { FormMessage, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import { initialActionState, type ActionState } from "@/lib/forms";
import { ColorField } from "./color-field";
import { FILAMENT_TYPES, isFilamentCategory } from "./schema";

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

// Kept short on purpose. Adding: item name ("גליל פילמנט" or another item),
// spool type, quantity and colour; the category and unit are set on the server.
// Editing: name and (for filament) colour.
// Fields that are no longer shown keep their stored values through hidden
// inputs, because saving an item replaces every field.
export function InventoryItemForm({
  action,
  defaultEquipmentId,
  item,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  labs?: { id: string; name: string }[];
  categories?: string[];
  units?: string[];
  equipment?: { id: string; name: string }[];
  defaultEquipmentId?: string;
  item?: Item;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const v = (x: string | null | undefined) => x ?? undefined;
  const submittedKind = state.values?.itemKind;
  const [kind, setKind] = useState<"filament" | "other">(submittedKind === "other" ? "other" : "filament");
  const submittedType = state.values?.materialType;
  const [materialType, setMaterialType] = useState(typeof submittedType === "string" ? submittedType : "");
  const isFilament = item ? isFilamentCategory(item.category) : kind === "filament";
  const showColor = isFilament || Boolean(item?.color);
  const machineIds = item?.equipmentIds ?? (defaultEquipmentId ? [defaultEquipmentId] : []);
  const kept: [string, string | null | undefined][] = item
    ? [
        ["category", item.category],
        ["unit", item.unit],
        ["labId", item.labId],
        ["minStockLevel", item.minStockLevel],
        ["storageLocation", item.storageLocation],
        ["supplier", item.supplier],
        ["unitCost", item.unitCost],
        ["quickStep", item.quickStep],
        ["notes", item.notes],
      ]
    : [];
  const typeErrors = state.fieldErrors?.materialType;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormMessage state={state} />
      {kept.map(([name, value]) => value != null && value !== "" && <input key={name} type="hidden" name={name} value={value} />)}
      {machineIds.map((id) => <input key={id} type="hidden" name="equipmentIds" value={id} />)}
      <div className="grid gap-4 sm:grid-cols-2">
        {item ? (
          <TextField name="name" label="שם הפריט" state={state} required defaultValue={v(item.name)} />
        ) : (
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">
              שם הפריט<span className="text-red-600"> *</span>
            </legend>
            <input type="hidden" name="itemKind" value={kind} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ChoiceButton pressed={kind === "filament"} onClick={() => setKind("filament")}>גליל פילמנט</ChoiceButton>
              <ChoiceButton pressed={kind === "other"} onClick={() => setKind("other")}>פריט אחר</ChoiceButton>
            </div>
            {kind === "other" && (
              <div className="mt-3">
                <TextField name="name" label="שם הפריט האחר" state={state} required />
              </div>
            )}
          </fieldset>
        )}
        {!item && kind === "filament" && (
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">
              סוג<span className="text-red-600"> *</span>
            </legend>
            <input type="hidden" name="materialType" value={materialType} />
            <div className="mt-2 grid grid-cols-3 gap-2" dir="ltr">
              {FILAMENT_TYPES.map((t) => (
                <ChoiceButton key={t} pressed={materialType === t} onClick={() => setMaterialType(t)}>{t}</ChoiceButton>
              ))}
            </div>
            {typeErrors?.map((e) => (
              <p key={e} className="mt-1 text-sm text-red-700">{e}</p>
            ))}
          </fieldset>
        )}
        {!item && (
          <TextField name="initialQuantity" label="כמות" state={state} inputMode="decimal" dir="ltr" hint={isFilament ? "מספר גלילים" : undefined} />
        )}
        {(showColor || !item) && <ColorField state={state} defaultValue={item?.color} hidden={!showColor} />}
      </div>
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}

function ChoiceButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-medium text-slate-700 aria-pressed:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:text-blue-800 aria-pressed:ring-2 aria-pressed:ring-blue-200"
    >
      {children}
    </button>
  );
}
