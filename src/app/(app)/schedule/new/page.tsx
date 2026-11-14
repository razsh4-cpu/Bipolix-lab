import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { startOfToday } from "@/lib/dates";
import { requirePermission } from "@/lib/session";
import { createActivityAction } from "@/modules/activities/actions";
import { toYmd } from "@/modules/activities/calendar";
import { ActivityForm } from "@/modules/activities/form";
import { knownLocations } from "@/modules/activities/service";

export const metadata = { title: "פעילות חדשה — LabOps" };

async function NewActivity({ searchParams }: { searchParams: PageProps<"/schedule/new">["searchParams"] }) {
  const ctx = await requirePermission("activity.manage");
  const [sp, locations] = await Promise.all([searchParams, knownLocations(db, ctx.organization.id)]);
  // Opened from a day in the calendar: start with that date (and hour).
  // Without a date from the calendar, start from today so the date picker opens on the right year.
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : toYmd(startOfToday());
  const startTime = typeof sp.start === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(sp.start) ? sp.start : undefined;
  return (
    <Card>
      <ActivityForm action={createActivityAction} locations={locations} submitLabel="שמירה" initial={{ date, startTime }} />
    </Card>
  );
}

export default function NewActivityPage({ searchParams }: PageProps<"/schedule/new">) {
  return (
    <>
      <PageHeader title="פעילות חדשה" />
      <Suspense fallback={<ListSkeleton />}>
        <NewActivity searchParams={searchParams} />
      </Suspense>
    </>
  );
}
