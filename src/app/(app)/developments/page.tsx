import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forms";
import { DEVELOPMENT_STATUS_LABELS, DEVELOPMENT_STATUS_TONES } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { DEVELOPMENT_STATUS_ORDER, listDevelopments } from "@/modules/developments/service";

export const metadata = { title: "פיתוחים בתהליך — LabOps" };

async function Developments() {
  const ctx = await requirePermission("development.view");
  const items = await listDevelopments(db, ctx.organization.id);
  const canManage = !ctx.isGuest && can(ctx.role, "development.manage");

  return (
    <>
      <PageHeader title="פיתוחים בתהליך" actions={canManage && <LinkButton href="/developments/new">פיתוח חדש</LinkButton>} />
      <p className="-mt-2 mb-4 text-sm text-slate-600">פרויקטים שמפותחים עבור המשאית: מה בדרך, מי אחראי ומתי צפוי.</p>
      {items.length === 0 ? (
        <EmptyState>
          עדיין לא נוספו פיתוחים.
          {canManage && <> <Link href="/developments/new" className="text-blue-700 underline">להוספת הפיתוח הראשון</Link></>}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {DEVELOPMENT_STATUS_ORDER.map((status) => {
            const group = items.filter((d) => d.status === status);
            if (group.length === 0) return null;
            return (
              <Card key={status} title={`${DEVELOPMENT_STATUS_LABELS[status]} (${group.length})`}>
                <ul className="divide-y divide-slate-100">
                  {group.map((d) => (
                    <li key={d.id} className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium">{d.title}</div>
                          <div className="text-xs text-slate-500">
                            {[d.owner && `אחראי: ${d.owner}`, d.targetDate && `יעד: ${formatDate(d.targetDate)}`, `עודכן ${formatDate(d.updatedAt)}`].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={DEVELOPMENT_STATUS_TONES[d.status]}>{DEVELOPMENT_STATUS_LABELS[d.status]}</Badge>
                          {canManage && <Link href={`/developments/${d.id}/edit`} className="text-sm text-blue-700 underline">עריכה</Link>}
                        </div>
                      </div>
                      {d.description && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{d.description}</p>}
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

export default function DevelopmentsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Developments />
    </Suspense>
  );
}
