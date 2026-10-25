import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listInventory, listInventoryCategories } from "@/modules/inventory/service";

export const metadata = { title: "מלאי — LabOps" };

const FILTER_INPUT = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

async function InventoryList({ searchParams }: { searchParams: PageProps<"/inventory">["searchParams"] }) {
  const ctx = await requirePermission("inventory.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const category = typeof sp.category === "string" && sp.category ? sp.category : undefined;
  const lowOnly = sp.low === "1";

  const [items, categories] = await Promise.all([
    listInventory(db, ctx.organization.id, { q: q || undefined, category, lowOnly }),
    listInventoryCategories(db, ctx.organization.id),
  ]);
  const filtered = Boolean(q || category || lowOnly);

  return (
    <>
      <PageHeader
        title="מלאי"
        actions={can(ctx.role, "inventory.manage") && <LinkButton href="/inventory/new">הוספת פריט</LinkButton>}
      />
      <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="חיפוש לפי שם, ספק, מיקום" aria-label="חיפוש" className={`${FILTER_INPUT} min-w-0 flex-1 basis-56`} />
        {categories.length > 0 && (
          <select name="category" defaultValue={category ?? ""} aria-label="קטגוריה" className={FILTER_INPUT}>
            <option value="">כל הקטגוריות</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="low" value="1" defaultChecked={lowOnly} /> רק מתחת לסף
        </label>
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">סינון</button>
        {filtered && <Link href="/inventory" className="text-sm text-blue-700 underline">ניקוי</Link>}
      </form>

      {items.length === 0 ? (
        <EmptyState>{filtered ? "לא נמצאו פריטים שמתאימים לסינון." : "עדיין לא נוספו פריטי מלאי."}</EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {items.map((i) => (
              <li key={i.id}>
                <Link href={`/inventory/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 px-1 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-slate-500">{[i.category, i.storageLocation].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.isLow && <Badge tone="amber">מתחת לסף ({Number(i.minStockLevel)})</Badge>}
                    <span className="text-lg font-semibold tabular-nums">
                      {Number(i.quantity)} <span className="text-sm font-normal text-slate-500">{i.unit}</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

export default function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <InventoryList searchParams={searchParams} />
    </Suspense>
  );
}
