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

// The day view lists activities from two weeks before the chosen day to two months after.
const AGENDA_BEFORE = 14;
const AGENDA_AFTER = 60;

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
  const { from, to } = view === "day" ? { from: addDays(date, -AGENDA_BEFORE), to: addDays(date, AGENDA_AFTER) } : visibleRange(view, date);
  const activities = await listActivitiesBetween(db, ctx.organization.id, from, to);
  const canEdit = can(ctx.role, "activity.manage");
  const todayKey = toYmd(today);
  const days = daysBetween(from, to);

  const monthList = view === "month" ? activities.filter((a) => a.date.getUTCMonth() === date.getUTCMonth()) : [];

  return (
    <>
      <PageHeader title="לו״ז המשאית" actions={canEdit && <NewActivityButton view={view} date={toYmd(date)} />} />
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
        <DayAgenda key={toYmd(date)} days={days} initialDay={toYmd(date)} today={todayKey} activities={activities} canEdit={canEdit} />
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
