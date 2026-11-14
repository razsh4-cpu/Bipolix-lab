"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui";
import type { ActivityStatus } from "@/generated/prisma/enums";
import { eventSpan, layoutDay, toYmd, viewTitle } from "./calendar";
import { ActivityList, type CalendarActivity } from "./calendar-view";

const HOUR_PX = 48;
// Height of a sticky day header, so the day under it counts as the one in view.
const HEADER_PX = 56;
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

// Day view like Google Calendar on a phone: one continuous timeline where the days
// follow each other top to bottom, each with all 24 hours and a header that sticks
// while its day is on screen. Opens on the current hour (or the day's first activity).
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
    const section = box?.querySelector<HTMLElement>(`[data-day="${initialDay}"]`);
    if (!box || !section) return;
    const timed = (byDay.get(initialDay) ?? []).filter((a) => a.startTime);
    const minutes =
      initialDay === today ? now : timed.length ? Math.min(...timed.map((a) => eventSpan({ startTime: a.startTime!, endTime: a.endTime }).start)) : 8 * 60;
    box.scrollTop = section.offsetTop + Math.max(0, (minutes / 60 - 1) * HOUR_PX);
    // Only on mount: later scrolling belongs to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the day in view: update the title, the details list and the URL (without reloading).
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const sections = Array.from(box.querySelectorAll<HTMLElement>("[data-day]"));
    let frame = 0;
    let current = initialDay;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = box.scrollTop + HEADER_PX;
        let day = sections[0]?.dataset.day ?? initialDay;
        for (const s of sections) {
          if (s.offsetTop > top) break;
          day = s.dataset.day!;
        }
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
  }, [initialDay]);

  const visibleDate = new Date(`${visible}T00:00:00Z`);
  const visibleItems = byDay.get(visible) ?? [];
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <div className="space-y-4">
      <div
        ref={scroller}
        className="relative h-[calc(100dvh-13rem)] min-h-[26rem] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <Link href={`/schedule?view=day&date=${toYmd(new Date(first.getTime() - 86_400_000))}`} className="block py-3 text-center text-sm text-blue-700">
          ↑ ימים קודמים
        </Link>
        {days.map((d) => {
          const key = toYmd(d);
          const items = byDay.get(key) ?? [];
          const untimed = items.filter((a) => !a.startTime);
          const timed = items.filter((a): a is CalendarActivity & { startTime: string } => !!a.startTime);
          const isToday = key === today;
          return (
            <section key={key} data-day={key} className="relative">
              <div className="sticky top-0 z-20 flex min-h-14 items-center gap-2 border-y border-slate-200 bg-slate-50/95 px-2 py-1.5 backdrop-blur">
                <span
                  className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-base font-semibold ${isToday ? "bg-blue-700 text-white" : "text-slate-800"}`}
                >
                  {d.getUTCDate()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${isToday ? "text-blue-800" : "text-slate-700"}`}>{viewTitle("day", d)}</div>
                  {untimed.map((a) => (
                    <EventLink key={a.id} a={a} canEdit={canEdit} className={`mt-0.5 block truncate rounded px-1.5 py-0.5 text-xs ${CHIP[a.status]}`}>
                      {a.title} · {a.location}
                    </EventLink>
                  ))}
                </div>
              </div>
              <div className="flex">
                <div className="relative w-11 shrink-0 border-e border-slate-100" style={{ height: 24 * HOUR_PX }}>
                  {HOURS.slice(1).map((h) => (
                    <div key={h} className="absolute inset-x-0 -translate-y-1/2 pe-1 text-start text-[11px] text-slate-500" style={{ top: h * HOUR_PX }} dir="ltr">
                      {pad(h)}:00
                    </div>
                  ))}
                </div>
                <div className="relative min-w-0 flex-1" style={{ height: 24 * HOUR_PX }}>
                  {HOURS.map((h) =>
                    canEdit ? (
                      <Link
                        key={h}
                        href={`/schedule/new?date=${key}&start=${pad(h)}:00`}
                        aria-label={`פעילות חדשה ב-${pad(h)}:00`}
                        className="absolute inset-x-0 border-t border-slate-100 hover:bg-blue-50/60 active:bg-blue-50"
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
            </section>
          );
        })}
        <Link href={`/schedule?view=day&date=${toYmd(new Date(last.getTime() + 86_400_000))}`} className="block border-t border-slate-200 py-3 text-center text-sm text-blue-700">
          ↓ ימים נוספים
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">פרטי הפעילויות · {viewTitle("day", visibleDate)}</h2>
        {visibleItems.length === 0 ? <EmptyState>אין פעילויות ביום הזה.</EmptyState> : <ActivityList rows={visibleItems} canEdit={canEdit} showDate={false} />}
      </section>
    </div>
  );
}

function EventLink({ a, canEdit, className, style, children }: { a: CalendarActivity; canEdit: boolean; className: string; style?: React.CSSProperties; children: React.ReactNode }) {
  if (!canEdit) return <span className={className} style={style} title={a.title}>{children}</span>;
  return <Link href={`/schedule/${a.id}/edit`} className={className} style={style} title={a.title}>{children}</Link>;
}
