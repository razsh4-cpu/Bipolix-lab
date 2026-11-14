"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import type { ActivityStatus } from "@/generated/prisma/enums";
import { WEEKDAY_SHORT, startOfWeek, toYmd, viewTitle } from "./calendar";
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
// activities (title, time, place). Every day is listed (empty ones compact), each with a "+" to add one.
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
      .map((d) => ({ date: d, key: toYmd(d), items: map.get(toYmd(d)) ?? [] }));
  }, [activities, days]);

  // Open on the chosen day.
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`[data-day="${initialDay}"]`);
    el?.scrollIntoView({ block: "start" });
    // Only on mount: later scrolling belongs to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={list} className="rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm sm:px-4">
      {groups.map((g, i) => {
        const isToday = g.key === today;
        const newWeek = i === 0 || toYmd(startOfWeek(g.date)) !== toYmd(startOfWeek(groups[i - 1].date));
        return (
          <div key={g.key} data-day={g.key} className="scroll-mt-4">
            {newWeek && <div className="px-1 pb-1 pt-4 text-xs font-semibold tracking-wide text-slate-500">{weekLabel(g.date)}</div>}
            <div className={`flex items-start gap-3 border-t border-slate-100 ${g.items.length ? "py-2" : "py-1"}`}>
              <div className="w-12 shrink-0 text-center">
                <div className={`text-xs ${isToday ? "font-semibold text-blue-700" : "text-slate-500"}`}>{WEEKDAY_SHORT[g.date.getUTCDay()]}</div>
                <div
                  className={`mx-auto inline-flex size-8 items-center justify-center rounded-full ${
                    isToday ? "bg-blue-700 font-semibold text-white" : "text-slate-800"
                  }`}
                >
                  {g.date.getUTCDate()}
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2 self-center">
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
              {canEdit && (
                <Link
                  href={`/schedule/new?date=${g.key}`}
                  aria-label={`פעילות חדשה ב-${DAY_MONTH.format(g.date)}`}
                  className="mt-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-300 text-lg leading-none text-blue-700 hover:bg-blue-50 active:bg-blue-100"
                >
                  +
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
