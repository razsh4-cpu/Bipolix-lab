"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import type { ProcedureKind } from "@/generated/prisma/enums";
import { initialActionState, type ActionState } from "@/lib/forms";
import { options, PROCEDURE_KIND_LABELS } from "@/lib/labels";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type Option = { id: string; name: string };
type Procedure = { title: string; kind: ProcedureKind; equipmentId: string | null; body: string; source: string };

export function ProcedureForm({
  action,
  equipment,
  procedure,
  defaultEquipmentId,
  submitLabel,
}: {
  action: Action;
  equipment: Option[];
  procedure?: Procedure;
  defaultEquipmentId?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <TextField name="title" label="שם הנוהל" state={state} required defaultValue={procedure?.title} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="kind" label="סוג" state={state} required defaultValue={procedure?.kind ?? "SAFETY"} options={options(PROCEDURE_KIND_LABELS)} />
        <SelectField
          name="equipmentId"
          label="מכונה"
          state={state}
          defaultValue={procedure?.equipmentId ?? defaultEquipmentId}
          placeholder="נוהל כללי למעבדה"
          options={equipment.map((e) => ({ value: e.id, label: e.name }))}
        />
      </div>
      <TextAreaField name="body" label="תוכן הנוהל" state={state} required rows={14} defaultValue={procedure?.body} />
      <TextField
        name="source"
        label="מקור"
        state={state}
        required
        defaultValue={procedure?.source}
        hint="למשל: מדריך היצרן עמ' 12, או נוהל שאושר על ידי רז. לא מזינים נהלי בטיחות בלי מקור."
      />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}
