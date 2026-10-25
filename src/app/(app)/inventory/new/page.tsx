import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { listLabs } from "@/modules/equipment/service";
import { createInventoryItemAction } from "@/modules/inventory/actions";
import { InventoryItemForm } from "@/modules/inventory/item-form";
import { INVENTORY_CATEGORY_SUGGESTIONS } from "@/modules/inventory/schema";
import { listInventoryCategories } from "@/modules/inventory/service";

export const metadata = { title: "הוספת פריט מלאי — LabOps" };

async function NewItem() {
  const ctx = await requirePermission("inventory.manage");
  const [labs, existing] = await Promise.all([listLabs(db, ctx.organization.id), listInventoryCategories(db, ctx.organization.id)]);
  const categories = [...new Set([...existing, ...INVENTORY_CATEGORY_SUGGESTIONS])];
  return (
    <Card>
      <InventoryItemForm action={createInventoryItemAction} labs={labs} categories={categories} submitLabel="הוספה" />
    </Card>
  );
}

export default function NewInventoryItemPage() {
  return (
    <>
      <PageHeader title="הוספת פריט מלאי" />
      <Suspense fallback={<ListSkeleton />}>
        <NewItem />
      </Suspense>
    </>
  );
}
