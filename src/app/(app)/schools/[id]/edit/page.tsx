import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { renameSchoolAction } from "@/modules/schools/actions";
import { SchoolForm } from "@/modules/schools/forms";
import { getSchool } from "@/modules/schools/service";

export const metadata = { title: "שינוי שם בית ספר — LabOps" };

async function EditSchool({ params }: { params: PageProps<"/schools/[id]/edit">["params"] }) {
  const ctx = await requirePermission("school.manage");
  const { id } = await params;
  const school = await getSchool(db, ctx.organization.id, id);
  if (!school) notFound();
  return (
    <>
      <PageHeader title={`שינוי שם: ${school.name}`} />
      <Card>
        <SchoolForm action={renameSchoolAction.bind(null, school.id)} name={school.name} submitLabel="שמירה" />
      </Card>
    </>
  );
}

export default function EditSchoolPage({ params }: PageProps<"/schools/[id]/edit">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EditSchool params={params} />
    </Suspense>
  );
}
