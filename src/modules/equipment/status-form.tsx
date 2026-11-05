"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextField } from "@/components/form-fields";
import { BUTTON_SECONDARY } from "@/components/ui";
import type { EquipmentStatus } from "@/generated/prisma/enums";
import { initialActionState, type ActionState } from "@/lib/forms";
import { EQUIPMENT_STATUS_LABELS, options } from "@/lib/labels";

export function EquipmentStatusForm({
  action,
  current,
  hasOpenCritical,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  current: EquipmentStatus;
  hasOpenCritical: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-3">
      {hasOpenCritical && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          יש תקלה קריטית פתוחה. החזרה לפעילות רק אחרי בדיקה של גורם מוסמך.
        </p>
      )}
      <SelectField name="status" label="סטטוס" state={state} defaultValue={current} options={options(EQUIPMENT_STATUS_LABELS)} />
      <TextField name="reason" label="סיבה (נשמרת ביומן)" state={state} />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={BUTTON_SECONDARY}>
        {pending ? "מעדכן…" : "עדכון סטטוס"}
      </button>
    </form>
  );
}
