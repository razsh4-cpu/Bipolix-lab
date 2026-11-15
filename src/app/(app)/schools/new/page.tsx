import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/session";
import { createSchoolAction } from "@/modules/schools/actions";
import { SchoolForm } from "@/modules/schools/forms";

export const metadata = { title: "בית ספר חדש — LabOps" };

async function NewSchool() {
  await requirePermission("school.manage");
  return (
    <Card>
      <SchoolForm action={createSchoolAction} submitLabel="הוספה" />
    </Card>
  );
}

export default function NewSchoolPage() {
  return (
    <>
      <PageHeader title="בית ספר חדש" />
      <Suspense fallback={<ListSkeleton />}>
        <NewSchool />
      </Suspense>
    </>
  );
}
