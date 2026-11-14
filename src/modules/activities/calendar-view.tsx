import Link from "next/link";
import { Badge } from "@/components/ui";
import type { ActivityStatus } from "@/generated/prisma/enums";
import { ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_TONES } from "@/lib/labels";
import {
  WEEKDAY_SHORT,
  hourRange,
  layoutDay,
  toYmd,
  type CalendarView,
} from "./calendar";

export type CalendarActivity = {
  id: string;
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

export const scheduleHref = (view: CalendarView, date: Date) => `/schedule?view=${view}&date=${toYmd(date)}`;

const CHIP: Record<ActivityStatus, string> = {
  PLANNED: "bg-blue-600 text-white",
  DONE: "bg-emerald-600 text-white",
  CANCELLED: "bg-slate-200 text-slate-500 line-through",
};
const BLOCK: Record<ActivityStatus, string> = {
  PLANNED: "border-blue-700 bg-blue-100 text-blue-950",
  DONE: "border-emerald-700 bg-emerald-100 text-emerald-950",
  CANCELLED: "border-slate-400 bg-slate-100 text-slate-500 line-through",
};

function timeLabel(a: CalendarActivity) {
  return a.startTime ? `${a.startTime}${a.endTime ? `–${a.endTime}` : ""}` : "";
}

function byDay(activities: CalendarActivity[]) {
  const map = new Map<string, CalendarActivity[]>();
  for (const a of activities) {
    const key = toYmd(a.date);
    map.set(key, [...(map.get(key) ?? []), a]);
  }
  return map;
}

function DayNumber({ date, today }: { date: Date; today: boolean }) {
  return (
    <span
      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium sm:size-7 sm:text-sm ${
        today ? "bg-blue-700 text-white" : ""
      }`}
    >
      {date.getUTCDate()}
    </span>
  );
}

// ───────────── Month ─────────────

const MONTH_CHIPS = 3;

export function MonthGrid({ days, month, today, activities }: { days: Date[]; month: number; today: string; activities: CalendarActivity[] }) {
  const map = byDay(activities);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-600">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = toYmd(d);
          const items = map.get(key) ?? [];
          const outside = d.getUTCMonth() !== month;
          return (
            <Link
              key={key}
              href={scheduleHref("day", d)}
              aria-label={`${d.getUTCDate()} – ${items.length} פעילויות`}
              className={`flex min-h-20 min-w-0 flex-col gap-0.5 border-b border-s border-slate-100 p-0.5 hover:bg-slate-50 sm:min-h-28 sm:p-1 ${
                outside ? "bg-slate-50/70 text-slate-400" : ""
              }`}
            >
              <div className="text-center">
                <DayNumber date={d} today={key === today} />
              </div>
              {items.slice(0, MONTH_CHIPS).map((a) => (
                <span key={a.id} className={`truncate rounded px-1 py-px text-[10px] leading-tight sm:text-xs ${CHIP[a.status]}`} title={a.title}>
                  <span className="hidden sm:inline">{a.startTime && `${a.startTime} `}</span>
                  {a.title}
                </span>
              ))}
              {items.length > MONTH_CHIPS && (
                <span className="px-1 text-[10px] text-slate-600 sm:text-xs">+{items.length - MONTH_CHIPS} נוספות</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ───────────── Week / Day (hour grid) ─────────────

const HOUR_PX = 48;

export function TimeGrid({
  days,
  today,
  now,
  activities,
  view,
  canEdit,
}: {
  days: Date[];
  today: string;
  // Minutes since midnight in Israel time, for the "now" line.
  now: number;
  activities: CalendarActivity[];
  view: "week" | "day";
  canEdit: boolean;
}) {
  const map = byDay(activities);
  const { first, last } = hourRange(activities);
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const untimed = days.map((d) => (map.get(toYmd(d)) ?? []).filter((a) => !a.startTime));
  const hasUntimed = untimed.some((u) => u.length > 0);
  const cols = { gridTemplateColumns: `2.75rem repeat(${days.length}, minmax(0, 1fr))` };
  const single = days.length === 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Day headers */}
      <div className="grid border-b border-slate-200 bg-slate-50" style={cols}>
        <div />
        {days.map((d) => {
          const key = toYmd(d);
          return (
            <Link key={key} href={scheduleHref("day", d)} className="flex flex-col items-center py-1.5 text-xs text-slate-600 hover:bg-slate-100">
              <span>{WEEKDAY_SHORT[d.getUTCDay()]}</span>
              <DayNumber date={d} today={key === today} />
            </Link>
          );
        })}
      </div>

      {/* Activities without a time */}
      {hasUntimed && (
        <div className="grid border-b border-slate-200" style={cols}>
          <div className="px-1 py-1 text-[10px] leading-tight text-slate-500">ללא שעה</div>
          {untimed.map((items, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-0.5 border-s border-slate-100 p-0.5">
              {items.map((a) => (
                <EventLink key={a.id} a={a} view={view} canEdit={canEdit} className={`truncate rounded px-1 py-0.5 text-[10px] sm:text-xs ${CHIP[a.status]}`}>
                  {a.title}
                  {single && ` · ${a.location}`}
                </EventLink>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Hours */}
      <div className="grid" style={cols}>
        <div className="relative" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((h, i) => (
            <div key={h} className="absolute inset-x-0 -translate-y-1/2 pe-1 text-start text-[10px] text-slate-500 sm:text-xs" style={{ top: i * HOUR_PX }} dir="ltr">
              {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>
        {days.map((d) => {
          const key = toYmd(d);
          const timed = (map.get(key) ?? []).filter((a): a is CalendarActivity & { startTime: string } => !!a.startTime);
          const nowTop = ((now - first * 60) / 60) * HOUR_PX;
          return (
            <div key={key} className="relative border-s border-slate-100" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h, i) =>
                canEdit && single ? (
                  <Link
                    key={h}
                    href={`/schedule/new?date=${key}&start=${String(h).padStart(2, "0")}:00`}
                    aria-label={`פעילות חדשה ב-${h}:00`}
                    className="absolute inset-x-0 border-t border-slate-100 hover:bg-blue-50/60"
                    style={{ top: i * HOUR_PX, height: HOUR_PX }}
                  />
                ) : (
                  <div key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: i * HOUR_PX, height: HOUR_PX }} />
                ),
              )}
              {key === today && nowTop >= 0 && nowTop <= hours.length * HOUR_PX && (
                <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500" style={{ top: nowTop }} aria-hidden>
                  <span className="absolute -top-[5px] -start-1 size-2 rounded-full bg-red-500" />
                </div>
              )}
              {layoutDay(timed).map(({ event: a, start, end, column, columns }) => {
                const height = Math.max(((end - start) / 60) * HOUR_PX - 2, 18);
                return (
                  <EventLink
                    key={a.id}
                    a={a}
                    view={view}
                    canEdit={canEdit}
                    className={`absolute z-10 overflow-hidden rounded-md border-s-4 px-1 py-0.5 text-[10px] leading-tight shadow-sm sm:text-xs ${BLOCK[a.status]}`}
                    style={{
                      top: ((start - first * 60) / 60) * HOUR_PX + 1,
                      height,
                      insetInlineStart: `calc(${(column / columns) * 100}% + 1px)`,
                      width: `calc(${100 / columns}% - 3px)`,
                    }}
                  >
                    <span className="block font-semibold">{a.title}</span>
                    {(single || height > 40) && <span className="block opacity-80" dir="ltr">{timeLabel(a)}</span>}
                    {single && <span className="block opacity-80">{a.location}</span>}
                  </EventLink>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// In the week view an activity opens its day; in the day view an admin opens the edit form.
function EventLink({
  a,
  view,
  canEdit,
  className,
  style,
  children,
}: {
  a: CalendarActivity;
  view: "week" | "day";
  canEdit: boolean;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const href = view === "week" ? scheduleHref("day", a.date) : canEdit ? `/schedule/${a.id}/edit` : null;
  if (!href) return <span className={className} style={style} title={a.title}>{children}</span>;
  return <Link href={href} className={className} style={style} title={a.title}>{children}</Link>;
}

// ───────────── Agenda list (under the month and day views) ─────────────

export function ActivityList({ rows, canEdit, showDate = true }: { rows: CalendarActivity[]; canEdit: boolean; showDate?: boolean }) {
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((a) => (
        <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
          <div className="min-w-0">
            <div className="text-sm text-slate-500">
              {showDate ? (
                <Link href={scheduleHref("day", a.date)} className="hover:underline">
                  {new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", weekday: "short", day: "numeric", month: "numeric" }).format(a.date)}
                </Link>
              ) : null}
              {showDate && a.startTime && " · "}
              {a.startTime && <span dir="ltr">{timeLabel(a)}</span>}
            </div>
            <div className="font-medium">{a.title}</div>
            <div className="text-sm text-slate-700">
              {a.location}
              {a.audience && ` · ${a.audience}`}
              {a.participants != null && ` · ${a.participants} משתתפים`}
            </div>
            {a.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.notes}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={ACTIVITY_STATUS_TONES[a.status]}>{ACTIVITY_STATUS_LABELS[a.status]}</Badge>
            {canEdit && <Link href={`/schedule/${a.id}/edit`} className="text-sm text-blue-700 underline">עריכה</Link>}
          </div>
        </li>
      ))}
    </ul>
  );
}
