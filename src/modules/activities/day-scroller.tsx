"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui";
import type { ActivityStatus } from "@/generated/prisma/enums";
import { WEEKDAY_SHORT, eventSpan, layoutDay, toYmd, viewTitle } from "./calendar";
import { ActivityList, type CalendarActivity } from "./calendar-view";

const HOUR_PX = 52;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const pad = (n: number) => String(n).padStart(2, "0");

const BLOCK: Record<ActivityStatus, string> = {
  PLANNED: "border-blue-700 bg-blue-100 text-blue-950",
  DONE: "border-emerald-700 bg-emerald-100 text-emerald-950",
  CANCELLED: "border-slate-400 bg-slate-100 text-slate-500 line-through",
};
const CHIP: Record<ActivityStatus, string> = {
  PLANNED: "bg-blue-600 text-white",
  DONE: "bg-emerald-600 text-white",
  CANCELLED: "bg-slate-200 text-slate-500 line-through",
};

// Day view like Google Calendar on a phone: swipe sideways between days, scroll
// up and down through all 24 hours, and open on the current hour (or the day's first activity).
export function DayScroller({
  days,
  initialDay,
  today,
  now,
  activities,
  canEdit,
}: {
  days: Date[];
  initialDay: string;
  today: string;
  // Minutes since midnight in Israel time.
  now: number;
  activities: CalendarActivity[];
  canEdit: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(initialDay);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>();
    for (const a of activities) {
      const key = toYmd(new Date(a.date));
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [activities]);

  // Open on the chosen day, scrolled to the current hour / first activity.
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const col = box.querySelector<HTMLElement>(`[data-day="${initialDay}"]`);
    const timed = (byDay.get(initialDay) ?? []).filter((a) => a.startTime);
    const minutes =
      initialDay === today ? now : timed.length ? Math.min(...timed.map((a) => eventSpan({ startTime: a.startTime!, endTime: a.endTime }).start)) : 8 * 60;
    box.scrollTop = Math.max(0, (minutes / 60 - 1) * HOUR_PX);
    col?.scrollIntoView({ block: "nearest", inline: "start" });
    // Only on mount: later scrolling belongs to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the day in view: update the title, the details list and the URL (without reloading).
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    let frame = 0;
    let current = initialDay;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const col = box.querySelector<HTMLElement>("[data-day]");
        if (!col) return;
        // Days run from the start edge, so |scrollLeft| works for RTL and LTR alike.
        const index = Math.min(days.length - 1, Math.max(0, Math.round(Math.abs(box.scrollLeft) / col.offsetWidth)));
        const day = toYmd(days[index]);
        if (day === current) return;
        current = day;
        setVisible(day);
        const params = new URLSearchParams(window.location.search);
        params.set("view", "day");
        params.set("date", day);
        window.history.replaceState(null, "", `?${params}`);
      });
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      box.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [days, initialDay]);

  const visibleDate = new Date(`${visible}T00:00:00Z`);
  const visibleItems = byDay.get(visible) ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{viewTitle("day", visibleDate)}</h2>
      <div
        ref={scroller}
        className="@container relative h-[calc(100dvh-15rem)] min-h-[26rem] snap-x snap-mandatory scroll-ps-11 overflow-auto overscroll-x-contain rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex w-max">
          {/* Hour labels stay put while days slide past */}
          <div className="sticky start-0 z-30 w-11 shrink-0 border-e border-slate-100 bg-white">
            <div className="sticky top-0 z-30 h-14 bg-slate-50" />
            <div className="relative" style={{ height: 24 * HOUR_PX }}>
              {HOURS.slice(1).map((h) => (
                <div key={h} className="absolute inset-x-0 -translate-y-1/2 pe-1 text-start text-[11px] text-slate-500" style={{ top: h * HOUR_PX }} dir="ltr">
                  {pad(h)}:00
                </div>
              ))}
            </div>
          </div>

          {days.map((d) => {
            const key = toYmd(d);
            const items = byDay.get(key) ?? [];
            const untimed = items.filter((a) => !a.startTime);
            const timed = items.filter((a): a is CalendarActivity & { startTime: string } => !!a.startTime);
            const isToday = key === today;
            return (
              <div key={key} data-day={key} className="w-[calc(100cqw-2.75rem)] shrink-0 snap-start border-e border-slate-100">
                <div className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-slate-50 px-2">
                  <span className="text-xs text-slate-600">{WEEKDAY_SHORT[d.getUTCDay()]}</span>
                  <span
                    className={`inline-flex size-8 items-center justify-center rounded-full text-base font-semibold ${isToday ? "bg-blue-700 text-white" : "text-slate-800"}`}
                  >
                    {d.getUTCDate()}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {untimed.map((a) => (
                      <EventLink key={a.id} a={a} canEdit={canEdit} className={`truncate rounded px-1.5 py-0.5 text-xs ${CHIP[a.status]}`}>
                        {a.title} · {a.location}
                      </EventLink>
                    ))}
                  </div>
                </div>
                <div className="relative" style={{ height: 24 * HOUR_PX }}>
                  {HOURS.map((h) =>
                    canEdit ? (
                      <Link
                        key={h}
                        href={`/schedule/new?date=${key}&start=${pad(h)}:00`}
                        aria-label={`פעילות חדשה ב-${pad(h)}:00`}
                        className="absolute inset-x-0 border-t border-slate-100 active:bg-blue-50 hover:bg-blue-50/60"
                        style={{ top: h * HOUR_PX, height: HOUR_PX }}
                      />
                    ) : (
                      <div key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: h * HOUR_PX, height: HOUR_PX }} />
                    ),
                  )}
                  {isToday && (
                    <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: (now / 60) * HOUR_PX }} aria-hidden>
                      <span className="absolute -top-[5px] -start-1 size-2 rounded-full bg-red-500" />
                    </div>
                  )}
                  {layoutDay(timed).map(({ event: a, start, end, column, columns }) => (
                    <EventLink
                      key={a.id}
                      a={a}
                      canEdit={canEdit}
                      className={`absolute z-10 overflow-hidden rounded-md border-s-4 px-1.5 py-0.5 text-xs leading-tight shadow-sm ${BLOCK[a.status]}`}
                      style={{
                        top: (start / 60) * HOUR_PX + 1,
                        height: Math.max(((end - start) / 60) * HOUR_PX - 2, 20),
                        insetInlineStart: `calc(${(column / columns) * 100}% + 2px)`,
                        width: `calc(${100 / columns}% - 6px)`,
                      }}
                    >
                      <span className="block font-semibold">{a.title}</span>
                      <span className="block opacity-80" dir="ltr">{a.startTime}{a.endTime && `–${a.endTime}`}</span>
                      <span className="block opacity-80">{a.location}</span>
                    </EventLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">פרטי הפעילויות</h2>
        {visibleItems.length === 0 ? <EmptyState>אין פעילויות ביום הזה.</EmptyState> : <ActivityList rows={visibleItems} canEdit={canEdit} showDate={false} />}
      </section>
    </div>
  );
}

function EventLink({ a, canEdit, className, style, children }: { a: CalendarActivity; canEdit: boolean; className: string; style?: React.CSSProperties; children: React.ReactNode }) {
  if (!canEdit) return <span className={className} style={style} title={a.title}>{children}</span>;
  return <Link href={`/schedule/${a.id}/edit`} className={className} style={style} title={a.title}>{children}</Link>;
}
