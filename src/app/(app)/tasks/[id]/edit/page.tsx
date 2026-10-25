import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { equipmentOptions } from "@/modules/maintenance/service";
import { updateTaskAction } from "@/modules/tasks/actions";
import { TaskForm } from "@/modules/tasks/forms";
import { assignableMembers } from "@/modules/tasks/service";

export const metadata = { title: "עריכת משימה — LabOps" };

async function EditTask({ params }: { params: PageProps<"/tasks/[id]/edit">["params"] }) {
  const ctx = await requirePermission("task.manage");
  const { id } = await params;
  const [task, members, equipment] = await Promise.all([
    db.task.findFirst({ where: { id, organizationId: ctx.organization.id } }),
    assignableMembers(db, ctx.organization.id),
    equipmentOptions(db, ctx.organization.id),
  ]);
  if (!task) notFound();
  return (
    <>
      <PageHeader title={`עריכה: ${task.title}`} />
      <Card>
        <TaskForm action={updateTaskAction.bind(null, task.id)} members={members} equipment={equipment} task={task} submitLabel="שמירה" />
      </Card>
    </>
  );
}

export default function EditTaskPage({ params }: PageProps<"/tasks/[id]/edit">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EditTask params={params} />
    </Suspense>
  );
}
