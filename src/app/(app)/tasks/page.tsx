import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { TaskStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forms";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_TONES, TASK_STATUS_LABELS, TASK_STATUS_TONES } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listTasks } from "@/modules/tasks/service";

export const metadata = { title: "משימות — LabOps" };

function tabClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm ${active ? "bg-slate-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`;
}

async function TaskList({ searchParams }: { searchParams: PageProps<"/tasks">["searchParams"] }) {
  const ctx = await requirePermission("dashboard.view");
  const sp = await searchParams;
  const canBeAssigned = ctx.role !== "VIEWER";
  // Instructors land on their own tasks; everyone can switch to all.
  const scope = sp.scope === "all" || !canBeAssigned ? "all" : sp.scope === "mine" || ctx.role === "INSTRUCTOR" ? "mine" : "all";
  const status = typeof sp.status === "string" && (sp.status === "OPEN" || sp.status in TaskStatus) ? (sp.status as TaskStatus | "OPEN") : "OPEN";
  const tasks = await listTasks(db, ctx.organization.id, { assigneeId: scope === "mine" ? ctx.user.id : undefined, status });
  const href = (next: Record<string, string>) => `/tasks?${new URLSearchParams({ scope, status, ...next })}`;

  return (
    <>
      <PageHeader title="משימות" actions={can(ctx.role, "task.manage") && <LinkButton href="/tasks/new">משימה חדשה</LinkButton>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {canBeAssigned && (
          <>
            <Link href={href({ scope: "mine" })} className={tabClass(scope === "mine")}>המשימות שלי</Link>
            <Link href={href({ scope: "all" })} className={tabClass(scope === "all")}>כל המשימות</Link>
            <span className="mx-1 border-s border-slate-300" aria-hidden />
          </>
        )}
        <Link href={href({ status: "OPEN" })} className={tabClass(status === "OPEN")}>פתוחות</Link>
        {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
          <Link key={s} href={href({ status: s })} className={tabClass(status === s)}>{TASK_STATUS_LABELS[s]}</Link>
        ))}
      </div>
      {tasks.length === 0 ? (
        <EmptyState>אין משימות להצגה.</EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link href={`/tasks/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 px-1 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-sm text-slate-500">
                      {[t.assignee?.name ?? "לא משויך", t.equipment?.name, t.dueDate && `יעד ${formatDate(t.dueDate)}`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {t.isOverdue && <Badge tone="red">באיחור</Badge>}
                    {t.priority !== "MEDIUM" && <Badge tone={TASK_PRIORITY_TONES[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>}
                    <Badge tone={TASK_STATUS_TONES[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TaskList searchParams={searchParams} />
    </Suspense>
  );
}
