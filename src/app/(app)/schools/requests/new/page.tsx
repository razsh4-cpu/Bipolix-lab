import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { createPrintRequestAction } from "@/modules/schools/actions";
import { PrintRequestForm } from "@/modules/schools/forms";
import { listSchools } from "@/modules/schools/service";

export const metadata = { title: "בקשת הדפסה חדשה — LabOps" };

async function NewPrintRequest({ searchParams }: { searchParams: PageProps<"/schools/requests/new">["searchParams"] }) {
  const ctx = await requirePermission("school.manage");
  const [sp, schools] = await Promise.all([searchParams, listSchools(db, ctx.organization.id)]);
  // Opened from a school's card: start with that school selected.
  const schoolId = typeof sp.school === "string" && schools.some((s) => s.id === sp.school) ? sp.school : undefined;
  return (
    <Card>
      <PrintRequestForm action={createPrintRequestAction} schools={schools} request={{ schoolId }} submitLabel="שמירה" />
    </Card>
  );
}

export default function NewPrintRequestPage({ searchParams }: PageProps<"/schools/requests/new">) {
  return (
    <>
      <PageHeader title="בקשת הדפסה חדשה" />
      <Suspense fallback={<ListSkeleton />}>
        <NewPrintRequest searchParams={searchParams} />
      </Suspense>
    </>
  );
}
