import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { EquipmentStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { EQUIPMENT_PROCUREMENT_LABELS, EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_TONES } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import type { EquipmentProcurement } from "@/generated/prisma/enums";
import { listEquipment, listUsedEquipmentCategories } from "@/modules/equipment/service";

export const metadata = { title: "ציוד — LabOps" };

// Equipment in the lab first, then what is on its way, then what still needs buying.
const PROCUREMENT_ORDER: EquipmentProcurement[] = ["IN_SERVICE", "ON_ORDER", "TO_ORDER"];

const FILTER_INPUT = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

async function EquipmentList({ searchParams }: { searchParams: PageProps<"/equipment">["searchParams"] }) {
  const ctx = await requirePermission("equipment.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const status = typeof sp.status === "string" && sp.status in EquipmentStatus ? (sp.status as EquipmentStatus) : undefined;
  const category = typeof sp.category === "string" && sp.category ? sp.category : undefined;

  const [items, categories] = await Promise.all([
    listEquipment(db, ctx.organization.id, { q: q || undefined, status, category }),
    listUsedEquipmentCategories(db, ctx.organization.id),
  ]);
  const filtered = Boolean(q || status || category);

  return (
    <>
      <PageHeader
        title="ציוד"
        actions={can(ctx.role, "equipment.manage") && <LinkButton href="/equipment/new">הוספת ציוד</LinkButton>}
      />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="חיפוש לפי שם, יצרן, דגם, מיקום" aria-label="חיפוש" className={`${FILTER_INPUT} min-w-0 flex-1 basis-56`} />
        <select name="status" defaultValue={status ?? ""} aria-label="סטטוס" className={FILTER_INPUT}>
          <option value="">כל הסטטוסים</option>
          {Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {categories.length > 0 && (
          <select name="category" defaultValue={category ?? ""} aria-label="קטגוריה" className={FILTER_INPUT}>
            <option value="">כל הקטגוריות</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">סינון</button>
        {filtered && <Link href="/equipment" className="self-center text-sm text-blue-700 underline">ניקוי</Link>}
      </form>

      {items.length === 0 ? (
        <EmptyState>
          {filtered ? "לא נמצא ציוד שמתאים לסינון." : "עדיין לא נוסף ציוד."}
          {!filtered && can(ctx.role, "equipment.manage") && (
            <> <Link href="/equipment/new" className="text-blue-700 underline">להוספת הפריט הראשון</Link></>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {PROCUREMENT_ORDER.map((stage) => {
            const group = items.filter((e) => e.procurement === stage);
            if (group.length === 0) return null;
            return (
              <Card key={stage} title={`${EQUIPMENT_PROCUREMENT_LABELS[stage]} (${group.length})`}>
                <ul className="divide-y divide-slate-100">
                  {group.map((e) => (
                    <li key={e.id}>
                      <Link href={`/equipment/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 px-1 py-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <div className="font-medium">{e.name}</div>
                          <div className="text-sm text-slate-500">
                            {[e.category, e.manufacturer, e.model, e.location].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        {stage === "IN_SERVICE" && (
                          <div className="flex items-center gap-2">
                            {e._count.faultReports > 0 && <Badge tone="amber">{e._count.faultReports} תקלות פתוחות</Badge>}
                            <Badge tone={EQUIPMENT_STATUS_TONES[e.status]}>{EQUIPMENT_STATUS_LABELS[e.status]}</Badge>
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function EquipmentPage({ searchParams }: PageProps<"/equipment">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EquipmentList searchParams={searchParams} />
    </Suspense>
  );
}
