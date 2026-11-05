import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { createActivityAction } from "@/modules/activities/actions";
import { ActivityForm } from "@/modules/activities/form";
import { knownLocations } from "@/modules/activities/service";

export const metadata = { title: "פעילות חדשה — LabOps" };

async function NewActivity() {
  const ctx = await requirePermission("activity.manage");
  const locations = await knownLocations(db, ctx.organization.id);
  return (
    <Card>
      <ActivityForm action={createActivityAction} locations={locations} submitLabel="שמירה" />
    </Card>
  );
}

export default function NewActivityPage() {
  return (
    <>
      <PageHeader title="פעילות חדשה" />
      <Suspense fallback={<ListSkeleton />}>
        <NewActivity />
      </Suspense>
    </>
  );
}
