import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { equipmentOptions } from "@/modules/maintenance/service";
import { createTaskAction } from "@/modules/tasks/actions";
import { TaskForm } from "@/modules/tasks/forms";
import { assignableMembers } from "@/modules/tasks/service";

export const metadata = { title: "משימה חדשה — LabOps" };

async function NewTask({ searchParams }: { searchParams: PageProps<"/tasks/new">["searchParams"] }) {
  const ctx = await requirePermission("task.manage");
  const sp = await searchParams;
  const [members, equipment] = await Promise.all([assignableMembers(db, ctx.organization.id), equipmentOptions(db, ctx.organization.id)]);
  return (
    <Card>
      <TaskForm
        action={createTaskAction}
        members={members}
        equipment={equipment}
        defaultEquipmentId={typeof sp.equipmentId === "string" ? sp.equipmentId : undefined}
        submitLabel="יצירה"
      />
    </Card>
  );
}

export default function NewTaskPage({ searchParams }: PageProps<"/tasks/new">) {
  return (
    <>
      <PageHeader title="משימה חדשה" />
      <Suspense fallback={<ListSkeleton />}>
        <NewTask searchParams={searchParams} />
      </Suspense>
    </>
  );
}
