import { Suspense } from "react";
import { Card, EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { startOfToday } from "@/lib/dates";
import { requirePermission } from "@/lib/session";
import { recordMaintenanceAction } from "@/modules/maintenance/actions";
import { MaintenanceRecordForm } from "@/modules/maintenance/forms";
import { equipmentOptions } from "@/modules/maintenance/service";

export const metadata = { title: "תיעוד טיפול — LabOps" };

async function NewRecord({ searchParams }: { searchParams: PageProps<"/maintenance/records/new">["searchParams"] }) {
  const ctx = await requirePermission("maintenance.record");
  const sp = await searchParams;
  const org = ctx.organization.id;
  const [equipment, plans] = await Promise.all([
    equipmentOptions(db, org),
    db.maintenancePlan.findMany({
      where: { organizationId: org, isActive: true },
      orderBy: { nextDueAt: "asc" },
      select: { id: true, title: true, equipment: { select: { name: true } } },
    }),
  ]);
  if (equipment.length === 0) return <EmptyState>עדיין אין ציוד במערכת.</EmptyState>;

  const faultId = typeof sp.faultId === "string" ? sp.faultId : undefined;
  const fault = faultId
    ? await db.faultReport.findFirst({ where: { id: faultId, organizationId: org }, select: { id: true, equipmentId: true } })
    : null;
  const equipmentId = fault?.equipmentId ?? (typeof sp.equipmentId === "string" ? sp.equipmentId : undefined);

  return (
    <Card>
      <MaintenanceRecordForm
        action={recordMaintenanceAction}
        equipment={equipment}
        plans={plans.map((p) => ({ id: p.id, title: p.title, equipmentName: p.equipment.name }))}
        defaults={{ equipmentId, faultReportId: fault?.id, today: startOfToday().toISOString().slice(0, 10) }}
      />
    </Card>
  );
}

export default function NewRecordPage({ searchParams }: PageProps<"/maintenance/records/new">) {
  return (
    <>
      <PageHeader title="תיעוד טיפול" />
      <Suspense fallback={<ListSkeleton />}>
        <NewRecord searchParams={searchParams} />
      </Suspense>
    </>
  );
}
