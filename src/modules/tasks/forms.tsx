"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/ui";
import type { TaskPriority, TaskStatus } from "@/generated/prisma/enums";
import { initialActionState, toDateInput, type ActionState } from "@/lib/forms";
import { options, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type Option = { id: string; name: string };
type Task = {
  title: string;
  description: string | null;
  assigneeId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | null;
  equipmentId: string | null;
  notes: string | null;
};

export function TaskForm({
  action,
  members,
  equipment,
  task,
  defaultEquipmentId,
  submitLabel,
}: {
  action: Action;
  members: Option[];
  equipment: Option[];
  task?: Task;
  defaultEquipmentId?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const v = (x: string | null | undefined) => x ?? undefined;
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <TextField name="title" label="כותרת" state={state} required defaultValue={v(task?.title)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="assigneeId"
          label="אחראי"
          state={state}
          defaultValue={v(task?.assigneeId)}
          placeholder="לא משויך"
          options={members.map((m) => ({ value: m.id, label: m.name }))}
        />
        <TextField name="dueDate" label="תאריך יעד" type="date" state={state} defaultValue={toDateInput(task?.dueDate)} />
        <SelectField name="priority" label="עדיפות" state={state} defaultValue={task?.priority ?? "MEDIUM"} options={options(TASK_PRIORITY_LABELS)} />
        <SelectField name="status" label="סטטוס" state={state} defaultValue={task?.status ?? "TODO"} options={options(TASK_STATUS_LABELS)} />
        <SelectField
          name="equipmentId"
          label="ציוד קשור"
          state={state}
          defaultValue={v(task?.equipmentId) ?? defaultEquipmentId}
          placeholder="ללא"
          options={equipment.map((e) => ({ value: e.id, label: e.name }))}
        />
      </div>
      <TextAreaField name="description" label="תיאור" state={state} defaultValue={v(task?.description)} />
      <TextAreaField name="notes" label="הערות" state={state} rows={2} defaultValue={v(task?.notes)} />
      <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}

export function TaskStatusForm({ action, current }: { action: Action; current: TaskStatus }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-3">
      <SelectField name="status" label="סטטוס" state={state} defaultValue={current} options={options(TASK_STATUS_LABELS)} />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={BUTTON_SECONDARY}>
        {pending ? "מעדכן…" : "עדכון"}
      </button>
    </form>
  );
}
