import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { APP_TIME_ZONE, startOfToday } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { daysBetween, parseDay, parseView, shiftDate, toYmd, viewTitle, visibleRange, type CalendarView } from "@/modules/activities/calendar";
import { ActivityList, MonthGrid, TimeGrid, scheduleHref } from "@/modules/activities/calendar-view";
import { listActivitiesBetween } from "@/modules/activities/service";

export const metadata = { title: "לו״ז המשאית — LabOps" };

const VIEW_LABELS: Record<CalendarView, string> = { month: "חודש", week: "שבוע", day: "יום" };

function minutesNowInIsrael(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

const NAV_BTN = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 hover:bg-slate-50";

async function Schedule({ searchParams }: { searchParams: PageProps<"/schedule">["searchParams"] }) {
  const ctx = await requirePermission("activity.view");
  const sp = await searchParams;
  const now = new Date();
  const today = startOfToday(now);
  const view = parseView(sp.view);
  const date = parseDay(sp.date, today);
  const { from, to } = visibleRange(view, date);
  const activities = await listActivitiesBetween(db, ctx.organization.id, from, to);
  const canEdit = can(ctx.role, "activity.manage");
  const todayKey = toYmd(today);
  const days = daysBetween(from, to);

  const newHref = view === "day" ? `/schedule/new?date=${toYmd(date)}` : "/schedule/new";
  const monthList = view === "month" ? activities.filter((a) => a.date.getUTCMonth() === date.getUTCMonth()) : [];

  return (
    <>
      <PageHeader title="לו״ז המשאית" actions={canEdit && <LinkButton href={newHref}>פעילות חדשה</LinkButton>} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5" role="tablist" aria-label="תצוגה">
          {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
            <Link
              key={v}
              href={scheduleHref(v, date)}
              role="tab"
              aria-selected={v === view}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${v === view ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              {VIEW_LABELS[v]}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={scheduleHref(view, today)} className={NAV_BTN}>היום</Link>
          <Link href={scheduleHref(view, shiftDate(view, date, -1))} className={NAV_BTN} aria-label="הקודם">›</Link>
          <Link href={scheduleHref(view, shiftDate(view, date, 1))} className={NAV_BTN} aria-label="הבא">‹</Link>
        </div>
      </div>
      <h2 className="mb-3 text-lg font-semibold">{viewTitle(view, date)}</h2>

      {view === "month" ? (
        <div className="space-y-4">
          <MonthGrid days={days} month={date.getUTCMonth()} today={todayKey} activities={activities} />
          <Card title="פעילויות החודש">
            {monthList.length === 0 ? <EmptyState>אין פעילויות בחודש הזה.</EmptyState> : <ActivityList rows={monthList} canEdit={canEdit} />}
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <TimeGrid days={days} today={todayKey} now={minutesNowInIsrael(now)} activities={activities} view={view} canEdit={canEdit} />
          {view === "day" && (
            <Card title="פרטי הפעילויות">
              {activities.length === 0 ? (
                <EmptyState>אין פעילויות ביום הזה.</EmptyState>
              ) : (
                <ActivityList rows={activities} canEdit={canEdit} showDate={false} />
              )}
            </Card>
          )}
        </div>
      )}
    </>
  );
}

export default function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Schedule searchParams={searchParams} />
    </Suspense>
  );
}
