import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/forms";
import { FAULT_SEVERITY_LABELS, FAULT_SEVERITY_TONES, FAULT_STATUS_LABELS, MAINTENANCE_TYPE_LABELS, PLAN_SOURCE_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { deactivateMaintenancePlanAction } from "@/modules/maintenance/actions";
import { getMaintenanceOverview } from "@/modules/maintenance/service";

export const metadata = { title: "תקלות ותחזוקה — LabOps" };

async function Overview({ searchParams }: { searchParams: PageProps<"/maintenance">["searchParams"] }) {
  const ctx = await requirePermission("equipment.view");
  const sp = await searchParams;
  const filter = sp.faults === "all" ? "all" : "open";
  const { faults, plans, records } = await getMaintenanceOverview(db, ctx.organization.id, filter);
  const canManage = can(ctx.role, "maintenance.record");

  return (
    <>
      <PageHeader
        title="תקלות ותחזוקה"
        actions={
          <>
            {can(ctx.role, "fault.report") && <LinkButton href="/maintenance/faults/new">דיווח תקלה</LinkButton>}
            {canManage && <LinkButton href="/maintenance/records/new" variant="secondary">תיעוד טיפול</LinkButton>}
            {canManage && <LinkButton href="/maintenance/plans/new" variant="secondary">תוכנית תחזוקה</LinkButton>}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title={filter === "open" ? "תקלות פתוחות" : "כל התקלות"}
            actions={
              <Link href={filter === "open" ? "/maintenance?faults=all" : "/maintenance"} className="text-sm text-blue-700 underline">
                {filter === "open" ? "הצגת כל התקלות" : "רק פתוחות"}
              </Link>
            }
          >
            {faults.length === 0 ? (
              <EmptyState>{filter === "open" ? "אין תקלות פתוחות." : "לא דווחו תקלות."}</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {faults.map((f) => (
                  <li key={f.id}>
                    <Link href={`/maintenance/faults/${f.id}`} className="block px-1 py-3 hover:bg-slate-50">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{f.equipment.name}</span>
                        <Badge tone={FAULT_SEVERITY_TONES[f.severity]}>{FAULT_SEVERITY_LABELS[f.severity]}</Badge>
                        <Badge tone="slate">{FAULT_STATUS_LABELS[f.status]}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-slate-700">{f.description}</p>
                      <div className="text-sm text-slate-500">{formatDateTime(f.reportedAt)} · {f.reportedBy.name}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="תחזוקה מתוכננת">
            {plans.length === 0 ? (
              <EmptyState>אין תוכניות תחזוקה פעילות.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {plans.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/equipment/${p.equipment.id}`} className="font-medium text-blue-800 hover:underline">{p.equipment.name}</Link>
                      <div className="text-sm">{p.title}</div>
                      <div className="text-sm text-slate-500">
                        {formatDate(p.nextDueAt)}
                        {p.intervalDays && ` · כל ${p.intervalDays} ימים`} · {PLAN_SOURCE_LABELS[p.source]}
                      </div>
                      {p.isOverdue && <Badge tone="red">באיחור</Badge>}
                    </div>
                    {canManage && (
                      <form action={deactivateMaintenancePlanAction.bind(null, p.id)}>
                        <button type="submit" className="text-xs text-slate-500 underline">הפסקה</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="טיפולים אחרונים">
            {records.length === 0 ? (
              <EmptyState>לא תועדו טיפולים.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {records.map((r) => (
                  <li key={r.id}>
                    <Link href={`/equipment/${r.equipment.id}`} className="font-medium text-blue-800 hover:underline">{r.equipment.name}</Link>
                    <div className="text-sm text-slate-500">
                      {formatDate(r.performedAt)} · {MAINTENANCE_TYPE_LABELS[r.type]} · {r.performedBy.name}
                    </div>
                    <p className="line-clamp-2 text-sm">{r.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

export default function MaintenancePage({ searchParams }: PageProps<"/maintenance">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}
