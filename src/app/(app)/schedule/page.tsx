import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forms";
import { ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_TONES } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listActivities } from "@/modules/activities/service";

export const metadata = { title: "לו״ז המשאית — LabOps" };

type Row = Awaited<ReturnType<typeof listActivities>>["upcoming"][number];

function ActivityList({ rows, canEdit }: { rows: Row[]; canEdit: boolean }) {
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((a) => (
        <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
          <div className="min-w-0">
            <div className="text-sm text-slate-500">
              {formatDate(a.date)}
              {a.startTime && ` · ${a.startTime}${a.endTime ? `–${a.endTime}` : ""}`}
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

async function Schedule() {
  const ctx = await requirePermission("activity.view");
  const { upcoming, past } = await listActivities(db, ctx.organization.id);
  const canEdit = can(ctx.role, "activity.manage");
  return (
    <>
      <PageHeader title="לו״ז המשאית" actions={canEdit && <LinkButton href="/schedule/new">פעילות חדשה</LinkButton>} />
      <div className="space-y-4">
        <Card title="פעילויות קרובות">
          {upcoming.length === 0 ? <EmptyState>אין פעילויות מתוכננות.</EmptyState> : <ActivityList rows={upcoming} canEdit={canEdit} />}
        </Card>
        {past.length > 0 && (
          <Card title="פעילויות שעברו">
            <ActivityList rows={past} canEdit={canEdit} />
          </Card>
        )}
      </div>
    </>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Schedule />
    </Suspense>
  );
}
