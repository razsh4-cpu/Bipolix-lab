import type { ActivityRecurrence } from "@/generated/prisma/enums";

const DAY_MS = 86_400_000;

type Repeating = { date: Date; recurrence: ActivityRecurrence; recurrenceUntil: Date | null };

// Every day in [from, to] (inclusive, UTC-midnight dates) on which a stored activity
// occurs. A one-off occurs on its date; a daily one every day from its date until
// recurrenceUntil; a weekly one on the same weekday.
export function occurrenceDates(a: Repeating, from: Date, to: Date): Date[] {
  if (a.recurrence === "NONE") return a.date >= from && a.date <= to ? [a.date] : [];
  const step = a.recurrence === "DAILY" ? 1 : 7;
  const last = a.recurrenceUntil && a.recurrenceUntil < to ? a.recurrenceUntil : to;
  // First occurrence on or after `from`.
  let first = a.date;
  if (first < from) {
    const steps = Math.ceil((from.getTime() - first.getTime()) / (step * DAY_MS));
    first = new Date(first.getTime() + steps * step * DAY_MS);
  }
  const out: Date[] = [];
  for (let d = first; d <= last; d = new Date(d.getTime() + step * DAY_MS)) out.push(d);
  return out;
}

// One row per occurrence (same id, the occurrence's date), sorted by day and start time.
export function expandOccurrences<T extends Repeating & { startTime: string | null }>(rows: T[], from: Date, to: Date): T[] {
  return rows
    .flatMap((a) => occurrenceDates(a, from, to).map((date) => ({ ...a, date })))
    .sort((x, y) => x.date.getTime() - y.date.getTime() || (x.startTime ?? "").localeCompare(y.startTime ?? ""));
}
