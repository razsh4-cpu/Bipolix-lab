"use client";

import { useActionState, useState } from "react";
import { FormMessage, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { BUTTON_PRIMARY } from "@/components/ui";
import type { ActivityStatus } from "@/generated/prisma/enums";
import { initialActionState, toDateInput, type ActionState } from "@/lib/forms";
import { ACTIVITY_STATUS_LABELS, options } from "@/lib/labels";

type Activity = {
  title: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string;
  audience: string | null;
  participants: number | null;
  status: ActivityStatus;
  notes: string | null;
};

export function ActivityForm({
  action,
  activity,
  locations,
  submitLabel,
  initial,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  activity?: Activity;
  locations: string[];
  submitLabel: string;
  initial?: { date?: string; startTime?: string };
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const v = (x: string | null | undefined) => x ?? undefined;
  const [timeError, setTimeError] = useState(false);

  // Check the hours as they are picked: moving the start past the end pushes the end
  // an hour after it (like Google Calendar); an end at or before the start is flagged.
  function onTimesChange(e: React.FormEvent<HTMLFormElement>) {
    const target = e.target as HTMLInputElement;
    if (target.name !== "startTime" && target.name !== "endTime") return;
    const form = e.currentTarget;
    const start = (form.elements.namedItem("startTime") as HTMLInputElement).value;
    const endInput = form.elements.namedItem("endTime") as HTMLInputElement;
    if (target.name === "startTime" && start && endInput.value && endInput.value <= start) endInput.value = hourAfter(start);
    setTimeError(Boolean(start && endInput.value && endInput.value <= start));
  }

  return (
    <form action={formAction} onChange={onTimesChange} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <TextField name="title" label="שם הפעילות / הסדנה" state={state} required defaultValue={v(activity?.title)} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="date" label="תאריך" type="date" state={state} required defaultValue={activity ? toDateInput(activity.date) : initial?.date} />
        <TextField name="startTime" label="שעת התחלה" type="time" state={state} required dir="ltr" defaultValue={activity ? v(activity.startTime) : initial?.startTime} />
        <TextField name="endTime" label="שעת סיום" type="time" state={state} dir="ltr" defaultValue={v(activity?.endTime)} />
      </div>
      {timeError && (
        <p role="alert" className="-mt-3 text-sm font-medium text-red-700">
          שעת הסיום צריכה להיות אחרי שעת ההתחלה
        </p>
      )}
      <div>
        <TextField name="location" label="מיקום" state={state} required list="activity-locations" defaultValue={v(activity?.location)} hint="למשל: מכללת ספיר, או שם בית הספר והעיר" />
        <datalist id="activity-locations">
          {locations.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="audience" label="קהל" state={state} defaultValue={v(activity?.audience)} hint="קבוצה בלבד, בלי שמות. למשל: כיתה ח'" />
        <TextField name="participants" label="מספר משתתפים" state={state} inputMode="numeric" dir="ltr" defaultValue={activity?.participants ?? undefined} />
        <SelectField name="status" label="סטטוס" state={state} defaultValue={activity?.status ?? "PLANNED"} options={options(ACTIVITY_STATUS_LABELS)} />
      </div>
      <TextAreaField name="notes" label="הערות (חומרים, מכונות, הכנות)" state={state} rows={3} defaultValue={v(activity?.notes)} />
      <button type="submit" disabled={pending || timeError} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
        {pending ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}

function hourAfter(time: string) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + 60, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
