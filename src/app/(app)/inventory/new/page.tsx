import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { listLabs } from "@/modules/equipment/service";
import { createInventoryItemAction } from "@/modules/inventory/actions";
import { InventoryItemForm } from "@/modules/inventory/item-form";
import { INVENTORY_CATEGORY_SUGGESTIONS, INVENTORY_UNIT_SUGGESTIONS } from "@/modules/inventory/schema";
import { equipmentOptions } from "@/modules/maintenance/service";
import { listInventoryCategories } from "@/modules/inventory/service";

export const metadata = { title: "הוספת פריט מלאי — LabOps" };

async function NewItem({ searchParams }: { searchParams: PageProps<"/inventory/new">["searchParams"] }) {
  const ctx = await requirePermission("inventory.manage");
  const sp = await searchParams;
  const [labs, existing, equipment] = await Promise.all([
    listLabs(db, ctx.organization.id),
    listInventoryCategories(db, ctx.organization.id),
    equipmentOptions(db, ctx.organization.id),
  ]);
  const categories = [...new Set([...existing, ...INVENTORY_CATEGORY_SUGGESTIONS])];
  return (
    <Card>
      <InventoryItemForm
        action={createInventoryItemAction}
        labs={labs}
        categories={categories}
        units={INVENTORY_UNIT_SUGGESTIONS}
        equipment={equipment}
        defaultEquipmentId={typeof sp.equipmentId === "string" ? sp.equipmentId : undefined}
        submitLabel="הוספה"
      />
    </Card>
  );
}

export default function NewInventoryItemPage({ searchParams }: PageProps<"/inventory/new">) {
  return (
    <>
      <PageHeader title="הוספת פריט מלאי" />
      <Suspense fallback={<ListSkeleton />}>
        <NewItem searchParams={searchParams} />
      </Suspense>
    </>
  );
}
