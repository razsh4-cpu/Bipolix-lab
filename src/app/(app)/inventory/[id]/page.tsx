import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, DetailList, EmptyState, LinkButton, ListSkeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/forms";
import { INVENTORY_TX_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { recordStockMovementAction } from "@/modules/inventory/actions";
import { StockMovementForm } from "@/modules/inventory/movement-form";
import { getInventoryItem } from "@/modules/inventory/service";

async function ItemDetail({ params }: { params: PageProps<"/inventory/[id]">["params"] }) {
  const ctx = await requirePermission("inventory.view");
  const { id } = await params;
  const item = await getInventoryItem(db, ctx.organization.id, id);
  if (!item || item.archivedAt) notFound();

  const isLow = item.minStockLevel !== null && item.quantity.lessThan(item.minStockLevel);
  const allowed = (
    [
      ["ISSUE", "inventory.issue"],
      ["RECEIVE", "inventory.receive"],
      ["ADJUST", "inventory.adjust"],
    ] as const
  )
    .filter(([, permission]) => can(ctx.role, permission))
    .map(([type]) => type);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/inventory" className="text-sm text-blue-700 underline">חזרה למלאי</Link>
          <h1 className="mt-1 text-2xl font-bold">{item.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-3xl font-bold tabular-nums">{Number(item.quantity)}</span>
            <span className="text-slate-600">{item.unit}</span>
            {isLow && <Badge tone="amber">מתחת לסף המינימום</Badge>}
          </div>
        </div>
        {can(ctx.role, "inventory.manage") && <LinkButton href={`/inventory/${item.id}/edit`} variant="secondary">עריכת פרטים</LinkButton>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="פרטים">
            <DetailList
              items={[
                { label: "קטגוריה", value: item.category },
                { label: "סף מינימום", value: item.minStockLevel ? `${Number(item.minStockLevel)} ${item.unit}` : "ללא" },
                { label: "מיקום אחסון", value: item.storageLocation },
                { label: "ספק", value: item.supplier },
                { label: "מחיר ליחידה", value: item.unitCost ? `₪${Number(item.unitCost)}` : null },
                { label: "מעבדה", value: item.lab?.name },
                { label: "הערות", value: item.notes },
              ]}
            />
          </Card>
          <Card title="היסטוריית תנועות">
            {item.transactions.length === 0 ? (
              <EmptyState>עדיין אין תנועות.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-right text-slate-500">
                    <tr>
                      <th className="py-2 font-normal">תאריך</th>
                      <th className="py-2 font-normal">סוג</th>
                      <th className="py-2 font-normal">שינוי</th>
                      <th className="py-2 font-normal">יתרה</th>
                      <th className="py-2 font-normal">משתמש</th>
                      <th className="py-2 font-normal">סיבה</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {item.transactions.map((t) => {
                      const delta = Number(t.quantityDelta);
                      return (
                        <tr key={t.id}>
                          <td className="whitespace-nowrap py-2">{formatDateTime(t.createdAt)}</td>
                          <td className="py-2">{INVENTORY_TX_LABELS[t.type]}</td>
                          <td dir="ltr" className={`py-2 text-right tabular-nums ${delta < 0 ? "text-red-700" : "text-emerald-700"}`}>
                            {delta > 0 ? `+${delta}` : delta}
                          </td>
                          <td className="py-2 tabular-nums">{Number(t.balanceAfter)}</td>
                          <td className="py-2">{t.user.name}</td>
                          <td className="py-2 text-slate-600">{t.reason ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        {allowed.length > 0 && (
          <div>
            <Card title="רישום תנועה">
              <StockMovementForm action={recordStockMovementAction.bind(null, item.id)} allowed={allowed} unit={item.unit} />
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

export default function InventoryItemPage({ params }: PageProps<"/inventory/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ItemDetail params={params} />
    </Suspense>
  );
}
