import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, DetailList, EmptyState, LinkButton, ListSkeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/forms";
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_TONES,
  FAULT_SEVERITY_LABELS,
  FAULT_SEVERITY_TONES,
  FAULT_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { updateFaultAction } from "@/modules/maintenance/actions";
import { FaultUpdateForm } from "@/modules/maintenance/forms";
import { getFault } from "@/modules/maintenance/service";

async function FaultDetail({ params }: { params: PageProps<"/maintenance/faults/[id]">["params"] }) {
  const ctx = await requirePermission("equipment.view");
  const { id } = await params;
  const f = await getFault(db, ctx.organization.id, id);
  if (!f) notFound();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/maintenance" className="text-sm text-blue-700 underline">חזרה לתקלות ותחזוקה</Link>
          <h1 className="mt-1 text-2xl font-bold">תקלה: {f.equipment.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={FAULT_SEVERITY_TONES[f.severity]}>חומרה {FAULT_SEVERITY_LABELS[f.severity]}</Badge>
            <Badge tone="slate">{FAULT_STATUS_LABELS[f.status]}</Badge>
          </div>
        </div>
        {can(ctx.role, "maintenance.record") && (
          <LinkButton href={`/maintenance/records/new?faultId=${f.id}&equipmentId=${f.equipment.id}`}>תיעוד טיפול</LinkButton>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="פרטי הדיווח">
            <p className="mb-4 whitespace-pre-wrap">{f.description}</p>
            <DetailList
              items={[
                { label: "דווח על ידי", value: f.reportedBy.name },
                { label: "מועד הדיווח", value: formatDateTime(f.reportedAt) },
                { label: "מי מטפל", value: f.handledBy },
                { label: "תאריך יעד לתיקון", value: formatDate(f.expectedFixAt) },
                { label: "מועד טיפול", value: formatDateTime(f.resolvedAt) },
                {
                  label: "סטטוס הציוד כעת",
                  value: (
                    <Link href={`/equipment/${f.equipment.id}`}>
                      <Badge tone={EQUIPMENT_STATUS_TONES[f.equipment.status]}>{EQUIPMENT_STATUS_LABELS[f.equipment.status]}</Badge>
                    </Link>
                  ),
                },
              ]}
            />
          </Card>
          <Card title="יומן התקלה">
            <ul className="divide-y divide-slate-100">
              {f.updates.map((u) => (
                <li key={u.id} className="py-3">
                  <div className="text-sm text-slate-500">{formatDateTime(u.createdAt)} · {u.author.name}</div>
                  {u.toStatus && (
                    <p className="text-sm">
                      סטטוס: {u.fromStatus ? FAULT_STATUS_LABELS[u.fromStatus] : "—"} ← {FAULT_STATUS_LABELS[u.toStatus]}
                    </p>
                  )}
                  {u.note && <p className="whitespace-pre-wrap">{u.note}</p>}
                </li>
              ))}
              <li className="py-3">
                <div className="text-sm text-slate-500">{formatDateTime(f.reportedAt)} · {f.reportedBy.name}</div>
                <p className="text-sm">התקלה דווחה</p>
              </li>
            </ul>
          </Card>
          <Card title="טיפולים שתועדו">
            {f.maintenance.length === 0 ? (
              <EmptyState>עדיין לא תועד טיפול בתקלה.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {f.maintenance.map((m) => (
                  <li key={m.id} className="py-3">
                    <div className="text-sm text-slate-500">{formatDate(m.performedAt)} · {MAINTENANCE_TYPE_LABELS[m.type]} · {m.performedBy.name}</div>
                    <p>{m.description}</p>
                    {m.partsReplaced && <p className="text-sm text-slate-600">חלקים שהוחלפו: {m.partsReplaced}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        {can(ctx.role, "fault.manage") && (
          <div>
            <Card title="עדכון טיפול">
              <FaultUpdateForm action={updateFaultAction.bind(null, f.id)} current={f} />
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

export default function FaultPage({ params }: PageProps<"/maintenance/faults/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <FaultDetail params={params} />
    </Suspense>
  );
}
