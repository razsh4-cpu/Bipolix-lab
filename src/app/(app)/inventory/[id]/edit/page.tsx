import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { listLabs } from "@/modules/equipment/service";
import { updateInventoryItemAction } from "@/modules/inventory/actions";
import { InventoryItemForm } from "@/modules/inventory/item-form";
import { INVENTORY_CATEGORY_SUGGESTIONS, INVENTORY_UNIT_SUGGESTIONS } from "@/modules/inventory/schema";
import { equipmentOptions } from "@/modules/maintenance/service";
import { listInventoryCategories } from "@/modules/inventory/service";

export const metadata = { title: "עריכת פריט מלאי — LabOps" };

async function EditItem({ params }: { params: PageProps<"/inventory/[id]/edit">["params"] }) {
  const ctx = await requirePermission("inventory.manage");
  const { id } = await params;
  const [item, labs, existing, equipment] = await Promise.all([
    db.inventoryItem.findFirst({
      where: { id, organizationId: ctx.organization.id, archivedAt: null },
      include: { machines: { select: { equipmentId: true } } },
    }),
    listLabs(db, ctx.organization.id),
    listInventoryCategories(db, ctx.organization.id),
    equipmentOptions(db, ctx.organization.id),
  ]);
  if (!item) notFound();
  const categories = [...new Set([...existing, ...INVENTORY_CATEGORY_SUGGESTIONS])];
  return (
    <>
      <PageHeader title={`עריכה: ${item.name}`} />
      <p className="mb-4 text-sm text-slate-600">הכמות לא נערכת כאן. שינוי כמות נעשה דרך קליטה, הוצאה או התאמת ספירה.</p>
      <Card>
        <InventoryItemForm
          action={updateInventoryItemAction.bind(null, item.id)}
          labs={labs}
          categories={categories}
          units={INVENTORY_UNIT_SUGGESTIONS}
          equipment={equipment}
          item={{
            ...item,
            minStockLevel: item.minStockLevel?.toString() ?? null,
            unitCost: item.unitCost?.toString() ?? null,
            quickStep: item.quickStep.toString(),
            equipmentIds: item.machines.map((m) => m.equipmentId),
          }}
          submitLabel="שמירה"
        />
      </Card>
    </>
  );
}

export default function EditInventoryItemPage({ params }: PageProps<"/inventory/[id]/edit">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EditItem params={params} />
    </Suspense>
  );
}
