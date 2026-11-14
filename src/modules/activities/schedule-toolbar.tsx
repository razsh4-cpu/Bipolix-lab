"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BUTTON_PRIMARY } from "@/components/ui";
import { parseDay, shiftDate, toYmd, type CalendarView } from "./calendar";

const VIEW_LABELS: Record<CalendarView, string> = { month: "חודש", week: "שבוע", day: "יום" };
const NAV_BTN = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 hover:bg-slate-50";
const href = (view: CalendarView, date: Date) => (view === "day" ? "/schedule?view=day" : `/schedule?view=${view}&date=${toYmd(date)}`);

// In the day view "today" is already in the list: scroll to it instead of reloading.
function scrollToToday(today: string, e: React.MouseEvent) {
  const el = document.querySelector<HTMLElement>(`[data-day="${today}"]`);
  if (!el) return;
  e.preventDefault();
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 8, behavior: "smooth" });
}

// The day view updates ?date= while the user swipes between days, so links read the
// current URL rather than the date the page was rendered with.
function useCurrentDate(fallback: string) {
  const fallbackDate = new Date(`${fallback}T00:00:00Z`);
  return parseDay(useSearchParams().get("date") ?? undefined, fallbackDate);
}

export function ScheduleToolbar({ view, date, today }: { view: CalendarView; date: string; today: string }) {
  const current = useCurrentDate(date);
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5" role="tablist" aria-label="תצוגה">
        {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
          <Link
            key={v}
            href={href(v, current)}
            role="tab"
            aria-selected={v === view}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${v === view ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          >
            {VIEW_LABELS[v]}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          href={href(view, new Date(`${today}T00:00:00Z`))}
          onClick={view === "day" ? (e) => scrollToToday(today, e) : undefined}
          className={NAV_BTN}
        >
          היום
        </Link>
        {view !== "day" && (
          <>
            <Link href={href(view, shiftDate(view, current, -1))} className={NAV_BTN} aria-label="הקודם">›</Link>
            <Link href={href(view, shiftDate(view, current, 1))} className={NAV_BTN} aria-label="הבא">‹</Link>
          </>
        )}
      </div>
    </div>
  );
}

export function NewActivityButton() {
  return (
    <Link href="/schedule/new" className={BUTTON_PRIMARY}>
      פעילות חדשה
    </Link>
  );
}
