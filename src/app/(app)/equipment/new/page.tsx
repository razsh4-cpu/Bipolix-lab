import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { createEquipmentAction } from "@/modules/equipment/actions";
import { EquipmentForm } from "@/modules/equipment/equipment-form";
import { listEquipmentCategories, listLabs } from "@/modules/equipment/service";

export const metadata = { title: "הוספת ציוד — LabOps" };

async function NewEquipment() {
  const ctx = await requirePermission("equipment.manage");
  const [labs, categories] = await Promise.all([
    listLabs(db, ctx.organization.id),
    listEquipmentCategories(db, ctx.organization.id),
  ]);
  return (
    <Card>
      <EquipmentForm action={createEquipmentAction} labs={labs} categories={categories} submitLabel="הוספה" />
    </Card>
  );
}

export default function NewEquipmentPage() {
  return (
    <>
      <PageHeader title="הוספת ציוד" />
      <p className="mb-4 text-sm text-slate-600">רק שם וקטגוריה הם שדות חובה. שדות שלא ידועים כרגע אפשר להשאיר ריקים.</p>
      <Suspense fallback={<ListSkeleton />}>
        <NewEquipment />
      </Suspense>
    </>
  );
}
