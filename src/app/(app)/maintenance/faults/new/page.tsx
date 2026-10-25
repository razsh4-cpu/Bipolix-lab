import { Suspense } from "react";
import { Card, EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { reportFaultAction } from "@/modules/maintenance/actions";
import { FaultReportForm } from "@/modules/maintenance/forms";
import { equipmentOptions } from "@/modules/maintenance/service";

export const metadata = { title: "דיווח תקלה — LabOps" };

async function NewFault({ searchParams }: { searchParams: PageProps<"/maintenance/faults/new">["searchParams"] }) {
  const ctx = await requirePermission("fault.report");
  const sp = await searchParams;
  const equipment = await equipmentOptions(db, ctx.organization.id);
  if (equipment.length === 0) return <EmptyState>עדיין אין ציוד במערכת, ולכן אי אפשר לדווח תקלה.</EmptyState>;
  const equipmentId = typeof sp.equipmentId === "string" && equipment.some((e) => e.id === sp.equipmentId) ? sp.equipmentId : undefined;
  return (
    <Card>
      <FaultReportForm action={reportFaultAction} equipment={equipment} equipmentId={equipmentId} />
    </Card>
  );
}

export default function NewFaultPage({ searchParams }: PageProps<"/maintenance/faults/new">) {
  return (
    <>
      <PageHeader title="דיווח תקלה" />
      <Suspense fallback={<ListSkeleton />}>
        <NewFault searchParams={searchParams} />
      </Suspense>
    </>
  );
}
