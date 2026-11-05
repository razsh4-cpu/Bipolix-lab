import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { QuickRow } from "@/modules/inventory/quick-row";
import { listInventory } from "@/modules/inventory/service";
import { equipmentOptions } from "@/modules/maintenance/service";

export const metadata = { title: "הזנה מהירה — LabOps" };

const CHIP = "shrink-0 rounded-full border px-3 py-1.5 text-sm";

async function QuickEntry({ searchParams }: { searchParams: PageProps<"/inventory/quick">["searchParams"] }) {
  const ctx = await requirePermission("inventory.issue");
  const sp = await searchParams;
  const machine = typeof sp.machine === "string" && sp.machine ? sp.machine : undefined;
  const [items, machines] = await Promise.all([
    listInventory(db, ctx.organization.id, { equipmentId: machine }),
    equipmentOptions(db, ctx.organization.id),
  ]);
  const canReceive = can(ctx.role, "inventory.receive");
  const chip = (active: boolean) => `${CHIP} ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-800"}`;

  return (
    <>
      <PageHeader
        title="הזנה מהירה"
        actions={can(ctx.role, "inventory.manage") && (
          <LinkButton href={machine ? `/inventory/new?equipmentId=${machine}` : "/inventory/new"} variant="secondary">פריט חדש</LinkButton>
        )}
      />
      <p className="mb-3 text-sm text-slate-600">
        לחיצה על − רושמת שימוש, ולחיצה על + רושמת קליטה. כל לחיצה נשמרת בהיסטוריית הפריט.
      </p>
      <nav aria-label="סינון לפי מכונה" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href="/inventory/quick" className={chip(!machine)}>הכל</Link>
        {machines.map((m) => (
          <Link key={m.id} href={`/inventory/quick?machine=${m.id}`} className={chip(machine === m.id)}>{m.name}</Link>
        ))}
      </nav>
      <Card>
        {items.length === 0 ? (
          <EmptyState>{machine ? "אין פריטים שמקושרים למכונה הזו." : "אין עדיין פריטי מלאי."}</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((i) => (
              <QuickRow
                key={i.id}
                id={i.id}
                name={i.name}
                quantity={i.quantity.toString()}
                unit={i.unit}
                step={i.quickStep.toString()}
                isLow={i.isLow}
                canReceive={canReceive}
                canIssue
              />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function QuickEntryPage({ searchParams }: PageProps<"/inventory/quick">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <QuickEntry searchParams={searchParams} />
    </Suspense>
  );
}
