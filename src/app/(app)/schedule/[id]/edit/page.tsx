import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { updateActivityAction } from "@/modules/activities/actions";
import { ActivityForm } from "@/modules/activities/form";
import { getActivity, knownLocations } from "@/modules/activities/service";

export const metadata = { title: "עריכת פעילות — LabOps" };

async function EditActivity({ params }: { params: PageProps<"/schedule/[id]/edit">["params"] }) {
  const ctx = await requirePermission("activity.manage");
  const { id } = await params;
  const [activity, locations] = await Promise.all([getActivity(db, ctx.organization.id, id), knownLocations(db, ctx.organization.id)]);
  if (!activity) notFound();
  return (
    <Card>
      <ActivityForm action={updateActivityAction.bind(null, id)} activity={activity} locations={locations} submitLabel="שמירה" />
    </Card>
  );
}

export default function EditActivityPage({ params }: PageProps<"/schedule/[id]/edit">) {
  return (
    <>
      <PageHeader title="עריכת פעילות" />
      <Suspense fallback={<ListSkeleton />}>
        <EditActivity params={params} />
      </Suspense>
    </>
  );
}
