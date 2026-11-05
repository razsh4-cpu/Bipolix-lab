import { Suspense } from "react";
import { Card, EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { createMaintenancePlanAction } from "@/modules/maintenance/actions";
import { MaintenancePlanForm } from "@/modules/maintenance/forms";
import { equipmentOptions } from "@/modules/maintenance/service";

export const metadata = { title: "תוכנית תחזוקה — LabOps" };

async function NewPlan({ searchParams }: { searchParams: PageProps<"/maintenance/plans/new">["searchParams"] }) {
  const ctx = await requirePermission("maintenance.record");
  const sp = await searchParams;
  const equipment = await equipmentOptions(db, ctx.organization.id);
  if (equipment.length === 0) return <EmptyState>עדיין אין ציוד במערכת.</EmptyState>;
  const equipmentId = typeof sp.equipmentId === "string" ? sp.equipmentId : undefined;
  return (
    <Card>
      <MaintenancePlanForm action={createMaintenancePlanAction} equipment={equipment} equipmentId={equipmentId} />
    </Card>
  );
}

export default function NewPlanPage({ searchParams }: PageProps<"/maintenance/plans/new">) {
  return (
    <>
      <PageHeader title="תוכנית תחזוקה חדשה" />
      <Suspense fallback={<ListSkeleton />}>
        <NewPlan searchParams={searchParams} />
      </Suspense>
    </>
  );
}
