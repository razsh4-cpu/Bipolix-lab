import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { updateEquipmentAction } from "@/modules/equipment/actions";
import { EquipmentForm } from "@/modules/equipment/equipment-form";
import { listEquipmentCategories, listLabs } from "@/modules/equipment/service";

export const metadata = { title: "עריכת ציוד — LabOps" };

async function EditEquipment({ params }: { params: PageProps<"/equipment/[id]/edit">["params"] }) {
  const ctx = await requirePermission("equipment.manage");
  const { id } = await params;
  const [equipment, labs, categories] = await Promise.all([
    db.equipment.findFirst({ where: { id, organizationId: ctx.organization.id, archivedAt: null } }),
    listLabs(db, ctx.organization.id),
    listEquipmentCategories(db, ctx.organization.id),
  ]);
  if (!equipment) notFound();
  return (
    <>
      <PageHeader title={`עריכה: ${equipment.name}`} />
      <Card>
        <EquipmentForm
          action={updateEquipmentAction.bind(null, equipment.id)}
          labs={labs}
          categories={categories}
          equipment={equipment}
          submitLabel="שמירה"
        />
      </Card>
    </>
  );
}

export default function EditEquipmentPage({ params }: PageProps<"/equipment/[id]/edit">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EditEquipment params={params} />
    </Suspense>
  );
}
