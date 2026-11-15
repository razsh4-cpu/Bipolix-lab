import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { updatePrintRequestAction } from "@/modules/schools/actions";
import { PrintRequestForm } from "@/modules/schools/forms";
import { getPrintRequest, listSchools } from "@/modules/schools/service";

export const metadata = { title: "עריכת בקשת הדפסה — LabOps" };

async function EditPrintRequest({ params }: { params: PageProps<"/schools/requests/[id]/edit">["params"] }) {
  const ctx = await requirePermission("school.manage");
  const { id } = await params;
  const [request, schools] = await Promise.all([getPrintRequest(db, ctx.organization.id, id), listSchools(db, ctx.organization.id)]);
  if (!request) notFound();
  return (
    <Card>
      <PrintRequestForm action={updatePrintRequestAction.bind(null, request.id)} schools={schools} request={request} submitLabel="שמירה" />
    </Card>
  );
}

export default function EditPrintRequestPage({ params }: PageProps<"/schools/requests/[id]/edit">) {
  return (
    <>
      <PageHeader title="עריכת בקשת הדפסה" />
      <Suspense fallback={<ListSkeleton />}>
        <EditPrintRequest params={params} />
      </Suspense>
    </>
  );
}
