import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, DetailList, LinkButton, ListSkeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { startOfToday } from "@/lib/dates";
import { formatDate, formatDateTime } from "@/lib/forms";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_TONES, TASK_STATUS_LABELS, TASK_STATUS_TONES } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { updateTaskStatusAction } from "@/modules/tasks/actions";
import { TaskStatusForm } from "@/modules/tasks/forms";
import { getTask } from "@/modules/tasks/service";

async function TaskDetail({ params }: { params: PageProps<"/tasks/[id]">["params"] }) {
  const ctx = await requirePermission("dashboard.view");
  const { id } = await params;
  const t = await getTask(db, ctx.organization.id, id);
  if (!t) notFound();
  const isOverdue = t.status !== "COMPLETED" && t.dueDate !== null && t.dueDate < startOfToday();
  const canChangeStatus = can(ctx.role, "task.manage") || (can(ctx.role, "task.updateOwn") && t.assignee?.id === ctx.user.id);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/tasks" className="text-sm text-blue-700 underline">חזרה למשימות</Link>
          <h1 className="mt-1 text-2xl font-bold">{t.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={TASK_STATUS_TONES[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge>
            <Badge tone={TASK_PRIORITY_TONES[t.priority]}>עדיפות {TASK_PRIORITY_LABELS[t.priority]}</Badge>
            {isOverdue && <Badge tone="red">באיחור</Badge>}
          </div>
        </div>
        {can(ctx.role, "task.manage") && <LinkButton href={`/tasks/${t.id}/edit`} variant="secondary">עריכה</LinkButton>}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="פרטים">
            {t.description && <p className="mb-4 whitespace-pre-wrap">{t.description}</p>}
            <DetailList
              items={[
                { label: "אחראי", value: t.assignee?.name ?? "לא משויך" },
                { label: "תאריך יעד", value: formatDate(t.dueDate) },
                { label: "ציוד קשור", value: t.equipment && <Link href={`/equipment/${t.equipment.id}`} className="text-blue-800 underline">{t.equipment.name}</Link> },
                { label: "נוצרה על ידי", value: t.createdBy.name },
                { label: "נוצרה", value: formatDateTime(t.createdAt) },
                { label: "הושלמה", value: formatDateTime(t.completedAt) },
                { label: "הערות", value: t.notes },
              ]}
            />
          </Card>
        </div>
        {canChangeStatus && (
          <div>
            <Card title="עדכון סטטוס">
              <TaskStatusForm action={updateTaskStatusAction.bind(null, t.id)} current={t.status} />
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TaskDetail params={params} />
    </Suspense>
  );
}
