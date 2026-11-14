// Pure date helpers for the truck schedule calendar (month / week / day views).
// Dates are calendar days stored as UTC midnight, matching Activity.date (a DATE column).

export type CalendarView = "month" | "week" | "day";
export const CALENDAR_VIEWS: CalendarView[] = ["month", "week", "day"];

const DAY_MS = 86_400_000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseView(value: unknown): CalendarView {
  return typeof value === "string" && (CALENDAR_VIEWS as string[]).includes(value) ? (value as CalendarView) : "month";
}

// A YYYY-MM-DD query value as a UTC-midnight date, or the fallback when missing/invalid.
export function parseDay(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || !YMD.test(value)) return fallback;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || toYmd(d) !== value ? fallback : d;
}

export function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addMonths(date: Date, months: number) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  // Clamp the day so Jan 31 + 1 month lands on Feb 28/29, not March.
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), lastDay)));
}

// Weeks start on Sunday (Israeli calendar).
export function startOfWeek(date: Date) {
  return addDays(date, -date.getUTCDay());
}

export function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// The inclusive range of days shown by a view: full weeks for the month grid.
export function visibleRange(view: CalendarView, date: Date): { from: Date; to: Date } {
  if (view === "day") return { from: date, to: date };
  if (view === "week") {
    const from = startOfWeek(date);
    return { from, to: addDays(from, 6) };
  }
  const first = startOfMonth(date);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { from: startOfWeek(first), to: addDays(startOfWeek(last), 6) };
}

export function daysBetween(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function shiftDate(view: CalendarView, date: Date, step: 1 | -1) {
  if (view === "month") return addMonths(date, step);
  return addDays(date, view === "week" ? 7 * step : step);
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", ...opts });
const MONTH_YEAR = fmt({ month: "long", year: "numeric" });
const DAY_MONTH = fmt({ day: "numeric", month: "long" });
const FULL_DAY = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const WEEKDAY_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export function viewTitle(view: CalendarView, date: Date) {
  if (view === "month") return MONTH_YEAR.format(date);
  if (view === "day") return FULL_DAY.format(date);
  const from = startOfWeek(date);
  const to = addDays(from, 6);
  const year = to.getUTCFullYear();
  if (from.getUTCMonth() === to.getUTCMonth()) return `${from.getUTCDate()}–${DAY_MONTH.format(to)} ${year}`;
  return `${DAY_MONTH.format(from)} – ${DAY_MONTH.format(to)} ${year}`;
}

// ───────────── Time grid (week / day views) ─────────────

export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type Timed = { id: string; startTime: string | null; endTime: string | null };

export const DEFAULT_DURATION = 60;

// Start/end in minutes; a missing or invalid end means one hour.
export function eventSpan(e: { startTime: string; endTime: string | null }) {
  const start = timeToMinutes(e.startTime);
  const end = e.endTime ? timeToMinutes(e.endTime) : start + DEFAULT_DURATION;
  return { start, end: end > start ? end : start + DEFAULT_DURATION };
}

// Hours shown on the grid: 07:00–20:00 by default, widened to cover every event.
export function hourRange(events: Timed[], defaults = { first: 7, last: 20 }) {
  let { first, last } = defaults;
  for (const e of events) {
    if (!e.startTime) continue;
    const { start, end } = eventSpan({ startTime: e.startTime, endTime: e.endTime });
    first = Math.min(first, Math.floor(start / 60));
    last = Math.max(last, Math.ceil(end / 60));
  }
  return { first, last: Math.min(last, 24) };
}

// Side-by-side layout for overlapping events in one day column (like Google Calendar):
// each event gets a column index and the number of columns in its overlap cluster.
export function layoutDay<T extends Timed & { startTime: string }>(events: T[]) {
  const sorted = [...events]
    .map((e) => ({ event: e, ...eventSpan(e) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out: { event: T; start: number; end: number; column: number; columns: number }[] = [];
  let cluster: typeof out = [];
  let clusterEnd = -1;
  const flush = () => {
    const columns = Math.max(1, ...cluster.map((c) => c.column + 1));
    for (const c of cluster) out.push({ ...c, columns });
    cluster = [];
  };
  for (const item of sorted) {
    if (item.start >= clusterEnd && cluster.length) flush();
    const taken = new Set(cluster.filter((c) => c.end > item.start).map((c) => c.column));
    let column = 0;
    while (taken.has(column)) column++;
    cluster.push({ ...item, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length) flush();
  return out;
}
