import { Suspense } from "react";
import { Card, EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { APP_TIME_ZONE, startOfToday } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { addDays, daysBetween, parseDay, parseView, toYmd, viewTitle, visibleRange } from "@/modules/activities/calendar";
import { ActivityList, MonthGrid, TimeGrid } from "@/modules/activities/calendar-view";
import { DayAgenda } from "@/modules/activities/day-agenda";
import { NewActivityButton, ScheduleToolbar } from "@/modules/activities/schedule-toolbar";
import { listActivitiesBetween } from "@/modules/activities/service";

// The day view is one continuous list from today to a year ahead.
const AGENDA_DAYS = 365;

export const metadata = { title: "לו״ז המשאית — LabOps" };

function minutesNowInIsrael(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

async function Schedule({ searchParams }: { searchParams: PageProps<"/schedule">["searchParams"] }) {
  const ctx = await requirePermission("activity.view");
  const sp = await searchParams;
  const now = new Date();
  const today = startOfToday(now);
  const view = parseView(sp.view);
  const date = parseDay(sp.date, today);
  // Day view: always starts today, whatever date the address holds; ?focus= (a day
  // tapped elsewhere, or the day just saved) only scrolls to that day, extending the list if needed.
  const focus = view === "day" && typeof sp.focus === "string" ? parseDay(sp.focus, today) : null;
  const { from, to } =
    view === "day"
      ? {
          from: focus && focus < today ? focus : today,
          to: addDays(focus && focus > addDays(today, AGENDA_DAYS) ? focus : today, AGENDA_DAYS),
        }
      : visibleRange(view, date);
  const activities = await listActivitiesBetween(db, ctx.organization.id, from, to);
  const canEdit = can(ctx.role, "activity.manage");
  const todayKey = toYmd(today);
  const days = daysBetween(from, to);

  const monthList = view === "month" ? activities.filter((a) => a.date.getUTCMonth() === date.getUTCMonth()) : [];

  return (
    <>
      <PageHeader title="לו״ז המשאית" actions={canEdit && <NewActivityButton />} />
      <ScheduleToolbar view={view} date={toYmd(date)} today={todayKey} />
      {view !== "day" && <h2 className="mb-3 text-lg font-semibold">{viewTitle(view, date)}</h2>}

      {view === "month" ? (
        <div className="space-y-4">
          <MonthGrid days={days} month={date.getUTCMonth()} today={todayKey} activities={activities} />
          <Card title="פעילויות החודש">
            {monthList.length === 0 ? <EmptyState>אין פעילויות בחודש הזה.</EmptyState> : <ActivityList rows={monthList} canEdit={canEdit} />}
          </Card>
        </div>
      ) : view === "week" ? (
        <TimeGrid days={days} today={todayKey} now={minutesNowInIsrael(now)} activities={activities} view="week" canEdit={canEdit} />
      ) : (
        <DayAgenda key={focus ? toYmd(focus) : "today"} days={days} focusDay={focus ? toYmd(focus) : null} today={todayKey} activities={activities} canEdit={canEdit} />
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
