import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { equipmentOptions } from "@/modules/maintenance/service";
import { updateProcedureAction } from "@/modules/procedures/actions";
import { ProcedureForm } from "@/modules/procedures/forms";
import { getProcedure } from "@/modules/procedures/service";

export const metadata = { title: "עריכת נוהל — LabOps" };

async function EditProcedure({ params }: { params: PageProps<"/procedures/[id]/edit">["params"] }) {
  const ctx = await requirePermission("procedure.manage");
  const { id } = await params;
  const [procedure, equipment] = await Promise.all([getProcedure(db, ctx.organization.id, id), equipmentOptions(db, ctx.organization.id)]);
  if (!procedure) notFound();
  return (
    <Card>
      <p className="mb-4 text-sm text-slate-600">שמירה של שינוי בתוכן יוצרת גרסה {procedure.version + 1}. הגרסאות הקודמות נשמרות.</p>
      <ProcedureForm action={updateProcedureAction.bind(null, id)} equipment={equipment} procedure={procedure} submitLabel="שמירת גרסה" />
    </Card>
  );
}

export default function EditProcedurePage({ params }: PageProps<"/procedures/[id]/edit">) {
  return (
    <>
      <PageHeader title="עריכת נוהל" />
      <Suspense fallback={<ListSkeleton />}>
        <EditProcedure params={params} />
      </Suspense>
    </>
  );
}
