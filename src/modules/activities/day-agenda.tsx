"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import type { ActivityStatus } from "@/generated/prisma/enums";
import { WEEKDAY_SHORT, addDays, startOfWeek, toYmd, viewTitle } from "./calendar";
import type { CalendarActivity } from "./calendar-view";

const CARD: Record<ActivityStatus, string> = {
  PLANNED: "bg-blue-600 text-white",
  DONE: "bg-emerald-600 text-white",
  CANCELLED: "bg-slate-200 text-slate-500 line-through",
};

const DAY_MONTH = new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", day: "numeric", month: "long" });

function weekLabel(d: Date) {
  const from = startOfWeek(d);
  return viewTitle("week", from);
}

// Day view like Google Calendar's schedule: a list grouped by day with only the
// activities (title, time, place). Empty days are skipped, except today.
export function DayAgenda({
  days,
  initialDay,
  today,
  activities,
  canEdit,
}: {
  days: Date[];
  initialDay: string;
  today: string;
  activities: CalendarActivity[];
  canEdit: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>();
    for (const a of activities) {
      const key = toYmd(new Date(a.date));
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return days
      .map((d) => ({ date: d, key: toYmd(d), items: map.get(toYmd(d)) ?? [] }))
      .filter((g) => g.items.length > 0 || g.key === today);
  }, [activities, days, today]);

  // Open on the chosen day, or the next day that has activities.
  useEffect(() => {
    const target = groups.find((g) => g.key >= initialDay);
    const el = target && list.current?.querySelector<HTMLElement>(`[data-day="${target.key}"]`);
    el?.scrollIntoView({ block: "start" });
    // Only on mount: later scrolling belongs to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const first = days[0];
  const last = days[days.length - 1];

  return (
    <div ref={list} className="rounded-2xl border border-slate-200 bg-white px-2 pb-2 shadow-sm sm:px-4">
      <Link href={`/schedule?view=day&date=${toYmd(addDays(first, -1))}`} className="block py-3 text-center text-sm text-blue-700">
        ↑ פעילויות קודמות
      </Link>
      {groups.length === 0 && <p className="py-8 text-center text-slate-600">אין פעילויות בתקופה הזו.</p>}
      {groups.map((g, i) => {
        const isToday = g.key === today;
        const newWeek = i === 0 || toYmd(startOfWeek(g.date)) !== toYmd(startOfWeek(groups[i - 1].date));
        return (
          <div key={g.key} data-day={g.key} className="scroll-mt-4">
            {newWeek && <div className="px-1 pb-1 pt-4 text-xs font-semibold tracking-wide text-slate-500">{weekLabel(g.date)}</div>}
            <div className="flex gap-3 py-2">
              <div className="w-12 shrink-0 pt-1 text-center">
                <div className={`text-xs ${isToday ? "font-semibold text-blue-700" : "text-slate-500"}`}>{WEEKDAY_SHORT[g.date.getUTCDay()]}</div>
                <div
                  className={`mx-auto mt-0.5 inline-flex size-9 items-center justify-center rounded-full text-lg ${
                    isToday ? "bg-blue-700 font-semibold text-white" : "text-slate-800"
                  }`}
                >
                  {g.date.getUTCDate()}
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {g.items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
                    אין פעילויות היום · {DAY_MONTH.format(g.date)}
                  </div>
                )}
                {g.items.map((a) => {
                  const content = (
                    <>
                      <span className="block truncate font-medium">{a.title}</span>
                      <span className="block text-sm opacity-90">
                        {a.startTime ? <span dir="ltr">{a.startTime}{a.endTime && `–${a.endTime}`}</span> : "ללא שעה"}
                        {` · ${a.location}`}
                      </span>
                    </>
                  );
                  const cls = `block rounded-lg px-3 py-2 shadow-sm ${CARD[a.status]}`;
                  return canEdit ? (
                    <Link key={a.id} href={`/schedule/${a.id}/edit`} className={cls}>{content}</Link>
                  ) : (
                    <div key={a.id} className={cls}>{content}</div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      <Link href={`/schedule?view=day&date=${toYmd(addDays(last, 1))}`} className="block border-t border-slate-100 py-3 text-center text-sm text-blue-700">
        ↓ פעילויות נוספות
      </Link>
    </div>
  );
}
