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
  PLAN_SOURCE_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { changeEquipmentStatusAction } from "@/modules/equipment/actions";
import { getEquipment, OPEN_FAULT_STATUSES } from "@/modules/equipment/service";
import { EquipmentStatusForm } from "@/modules/equipment/status-form";

async function EquipmentDetail({ params }: { params: PageProps<"/equipment/[id]">["params"] }) {
  const ctx = await requirePermission("equipment.view");
  const { id } = await params;
  const e = await getEquipment(db, ctx.organization.id, id);
  if (!e || e.archivedAt) notFound();

  const openFaults = e.faultReports.filter((f) => (OPEN_FAULT_STATUSES as readonly string[]).includes(f.status));
  const hasOpenCritical = openFaults.some((f) => f.severity === "CRITICAL");
  const lastMaintenance = e.maintenance[0]?.performedAt;
  const nextPlan = e.plans[0];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/equipment" className="text-sm text-blue-700 underline">חזרה לרשימת הציוד</Link>
          <h1 className="mt-1 text-2xl font-bold">{e.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={EQUIPMENT_STATUS_TONES[e.status]}>{EQUIPMENT_STATUS_LABELS[e.status]}</Badge>
            {hasOpenCritical && <Badge tone="red">תקלה קריטית פתוחה — לא זמין עד בדיקה</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(ctx.role, "fault.report") && (
            <LinkButton href={`/maintenance/faults/new?equipmentId=${e.id}`}>דיווח תקלה</LinkButton>
          )}
          {can(ctx.role, "equipment.manage") && (
            <LinkButton href={`/equipment/${e.id}/edit`} variant="secondary">עריכה</LinkButton>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="פרטים">
            <DetailList
              items={[
                { label: "קטגוריה", value: e.category },
                { label: "מעבדה", value: e.lab?.name },
                { label: "מיקום", value: e.location },
                { label: "יצרן", value: e.manufacturer },
                { label: "דגם", value: e.model },
                { label: "מספר סידורי", value: e.serialNumber && <span dir="ltr">{e.serialNumber}</span> },
                { label: "תאריך רכישה", value: formatDate(e.purchaseDate) },
                { label: "תום אחריות", value: formatDate(e.warrantyExpiresAt) },
                { label: "טיפול אחרון", value: formatDate(lastMaintenance) },
                { label: "טיפול הבא", value: nextPlan ? `${formatDate(nextPlan.nextDueAt)} · ${nextPlan.title}` : "—" },
                { label: "הערות", value: e.notes },
              ]}
            />
          </Card>

          <Card title="הוראות בטיחות">
            {e.safetyInstructions ? (
              <p className="whitespace-pre-wrap">{e.safetyInstructions}</p>
            ) : (
              <EmptyState>לא הוזנו הוראות בטיחות. יש להזין רק לפי הוראות יצרן או נוהל מאושר.</EmptyState>
            )}
          </Card>

          <Card title="היסטוריית תקלות">
            {e.faultReports.length === 0 ? (
              <EmptyState>לא דווחו תקלות.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {e.faultReports.map((f) => (
                  <li key={f.id} className="py-3">
                    <Link href={`/maintenance/faults/${f.id}`} className="block hover:bg-slate-50">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={FAULT_SEVERITY_TONES[f.severity]}>{FAULT_SEVERITY_LABELS[f.severity]}</Badge>
                        <Badge tone="slate">{FAULT_STATUS_LABELS[f.status]}</Badge>
                        <span className="text-sm text-slate-500">{formatDateTime(f.reportedAt)} · {f.reportedBy.name}</span>
                      </div>
                      <p className="mt-1 line-clamp-2">{f.description}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="היסטוריית תחזוקה">
            {e.maintenance.length === 0 ? (
              <EmptyState>לא תועדו טיפולים.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {e.maintenance.map((m) => (
                  <li key={m.id} className="py-3">
                    <div className="text-sm text-slate-500">
                      {formatDate(m.performedAt)} · {MAINTENANCE_TYPE_LABELS[m.type]} · {m.performedBy.name}
                    </div>
                    <p className="mt-1">{m.description}</p>
                    {m.partsReplaced && <p className="text-sm text-slate-600">חלקים שהוחלפו: {m.partsReplaced}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {can(ctx.role, "equipment.returnToService") && (
            <Card title="שינוי סטטוס">
              <EquipmentStatusForm
                action={changeEquipmentStatusAction.bind(null, e.id)}
                current={e.status}
                hasOpenCritical={hasOpenCritical}
              />
            </Card>
          )}

          <Card
            title="תחזוקה מתוכננת"
            actions={can(ctx.role, "maintenance.record") && <Link href={`/maintenance/plans/new?equipmentId=${e.id}`} className="text-sm text-blue-700 underline">הוספה</Link>}
          >
            {e.plans.length === 0 ? (
              <EmptyState>אין תוכנית תחזוקה.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {e.plans.map((p) => (
                  <li key={p.id}>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-sm text-slate-500">
                      {formatDate(p.nextDueAt)}
                      {p.intervalDays && ` · כל ${p.intervalDays} ימים`} · {PLAN_SOURCE_LABELS[p.source]}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="משימות פתוחות">
            {e.tasks.length === 0 ? (
              <EmptyState>אין משימות פתוחות.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {e.tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tasks/${t.id}`} className="font-medium text-blue-800 hover:underline">{t.title}</Link>
                    <div className="text-sm text-slate-500">
                      {TASK_STATUS_LABELS[t.status]} · {t.assignee?.name ?? "לא משויך"} · יעד {formatDate(t.dueDate)}
                    </div>
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

export default function EquipmentDetailPage({ params }: PageProps<"/equipment/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EquipmentDetail params={params} />
    </Suspense>
  );
}
