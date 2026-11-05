import Link from "next/link";
import { Suspense } from "react";
import { startOfToday } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/forms";
import { EQUIPMENT_STATUS_LABELS, FAULT_SEVERITY_LABELS, FAULT_STATUS_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { getOrgContext } from "@/lib/session";
import type { Condition, MachineBoardRow } from "@/modules/dashboard/machine-board";
import { getOverview, type AlertLevel, type DashboardAlert, type MaterialRow } from "@/modules/dashboard/overview";
import { getDashboardStats } from "@/modules/dashboard/stats";

export const metadata = { title: "דשבורד — LabOps" };

function Panel({ title, href, className = "", children, aside }: { title: string; href?: string; className?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {href ? <Link href={href} className="hover:text-blue-800 hover:underline">{title}</Link> : title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const ALERT_STYLE: Record<AlertLevel, { dot: string; label: string }> = {
  critical: { dot: "bg-red-600", label: "דחוף" },
  warning: { dot: "bg-amber-500", label: "לטיפול" },
  info: { dot: "bg-slate-400", label: "לעדכון" },
};

const SHOWN_ALERTS = 6;

function AlertList({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <ul className="space-y-1">
      {alerts.map((a, i) => (
        <li key={i}>
          <Link href={a.href} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ALERT_STYLE[a.level].dot}`} aria-hidden />
            <span className="sr-only">{ALERT_STYLE[a.level].label}: </span>
            <span>{a.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Alerts({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <Panel title="התראות" className="lg:col-span-2" aside={alerts.length > 0 && <span className="text-sm text-slate-600">{alerts.length}</span>}>
      {alerts.length === 0 ? (
        <p className="text-emerald-800">אין התראות. הכל מעודכן.</p>
      ) : (
        <>
          <AlertList alerts={alerts.slice(0, SHOWN_ALERTS)} />
          {alerts.length > SHOWN_ALERTS && (
            <details className="mt-1">
              <summary className="cursor-pointer px-2 text-sm text-blue-700 underline">ועוד {alerts.length - SHOWN_ALERTS} התראות</summary>
              <AlertList alerts={alerts.slice(SHOWN_ALERTS)} />
            </details>
          )}
        </>
      )}
    </Panel>
  );
}

type Schedule = Awaited<ReturnType<typeof getOverview>>["schedule"];

function timeRange(a: { startTime: string | null; endTime: string | null }) {
  if (!a.startTime) return "";
  return a.endTime ? `${a.startTime}–${a.endTime}` : a.startTime;
}

function Truck({ schedule, canEdit }: { schedule: Schedule; canEdit: boolean }) {
  const here = schedule.today[0];
  return (
    <Panel title="איפה המשאית" href="/schedule" aside={canEdit && <Link href="/schedule/new" className="text-sm text-blue-700 underline">הוספה</Link>}>
      <div className="rounded-xl bg-blue-50 p-3">
        <div className="text-sm text-blue-900">היום</div>
        {here ? (
          <ul className="space-y-2">
            {schedule.today.map((a) => (
              <li key={a.id}>
                <div className="text-lg font-semibold text-blue-950">{a.location}</div>
                <div className="text-sm text-blue-900">
                  {[timeRange(a), a.title, a.audience].filter(Boolean).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="font-semibold text-blue-950">אין פעילות מתוכננת</div>
            {schedule.lastLocation && (
              <div className="text-sm text-blue-900">
                מיקום אחרון ידוע: {schedule.lastLocation.location} ({formatDate(schedule.lastLocation.date)})
              </div>
            )}
          </>
        )}
      </div>
      <h3 className="mb-1 mt-4 text-sm font-medium text-slate-600">הבאות</h3>
      {schedule.next.length === 0 ? (
        <p className="text-sm text-slate-500">אין פעילויות מתוכננות.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {schedule.next.map((a) => (
            <li key={a.id} className="py-2">
              <div className="text-sm text-slate-500">{formatDate(a.date)}{a.startTime && ` · ${timeRange(a)}`}</div>
              <div className="font-medium">{a.title}</div>
              <div className="text-sm text-slate-700">{a.location}</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const CONDITION_STYLE: Record<Condition, { label: string; card: string; badge: string }> = {
  ok: { label: "תקינה ופנויה", card: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800" },
  busy: { label: "בשימוש", card: "border-blue-200", badge: "bg-blue-100 text-blue-800" },
  attention: { label: "דורשת תשומת לב", card: "border-amber-300", badge: "bg-amber-100 text-amber-900" },
  down: { label: "לא זמינה", card: "border-red-300 bg-red-50/40", badge: "bg-red-100 text-red-800" },
};

function MachineCard({ m, today }: { m: MachineBoardRow; today: Date }) {
  const style = CONDITION_STYLE[m.condition];
  return (
    <li className={`rounded-xl border bg-white p-3 ${style.card}`}>
      <Link href={`/equipment/${m.id}`} className="flex items-start justify-between gap-2">
        <span className="font-semibold hover:underline">{m.name}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>{style.label}</span>
      </Link>
      {m.status !== "OPERATIONAL" && <p className="mt-1 text-sm text-slate-700">סטטוס: {EQUIPMENT_STATUS_LABELS[m.status]}</p>}
      {m.faultReports.length > 0 && (
        <ul className="mt-2 space-y-2">
          {m.faultReports.map((f) => {
            const late = f.expectedFixAt && f.expectedFixAt < today;
            return (
              <li key={f.id} className="text-sm">
                <Link href={`/maintenance/faults/${f.id}`} className="block rounded-lg bg-slate-50 p-2 hover:bg-slate-100">
                  <span className="line-clamp-2">{f.description}</span>
                  <span className="mt-1 block text-xs text-slate-600">
                    חומרה {FAULT_SEVERITY_LABELS[f.severity]} · {FAULT_STATUS_LABELS[f.status]}
                    {" · "}
                    {f.handledBy ? `מטפל: ${f.handledBy}` : <span className="text-amber-800">לא הוגדר מי מטפל</span>}
                    {f.expectedFixAt && (
                      <span className={late ? "font-medium text-red-700" : undefined}>
                        {" · "}יעד: {formatDate(f.expectedFixAt)}{late && " (עבר)"}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {m.plans.map((p) => (
        <p key={p.title} className="mt-2 text-sm text-amber-900">טיפול באיחור: {p.title} ({formatDate(p.nextDueAt)})</p>
      ))}
      {m.lowStock.length > 0 && (
        <p className="mt-2 text-sm text-amber-900">
          מלאי חסר:{" "}
          {m.lowStock.map((i, idx) => (
            <span key={i.id}>
              {idx > 0 && ", "}
              <Link href={`/inventory/${i.id}`} className="underline">{i.name}</Link> ({Number(i.quantity)} {i.unit})
            </span>
          ))}
        </p>
      )}
    </li>
  );
}

function MachineBoard({ machines }: { machines: MachineBoardRow[] }) {
  const today = startOfToday(new Date());
  const count = (c: Condition) => machines.filter((m) => m.condition === c).length;
  const summary = [
    `${count("ok")} פנויות`,
    count("busy") > 0 && `${count("busy")} בשימוש`,
    count("attention") > 0 && `${count("attention")} לתשומת לב`,
    count("down") > 0 && `${count("down")} לא זמינות`,
  ].filter(Boolean).join(" · ");
  return (
    <Panel title="מצב המכונות" href="/equipment" className="lg:col-span-3" aside={machines.length > 0 && <span className="text-sm text-slate-600">{summary}</span>}>
      {machines.length === 0 ? (
        <p className="text-slate-600">עדיין לא הוזנו מכונות.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((m) => (
            <MachineCard key={m.id} m={m} today={today} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

const MATERIAL_DOT: Record<MaterialRow["state"], string> = { out: "bg-red-600", low: "bg-amber-500", ok: "bg-emerald-500" };
const MATERIAL_TEXT: Record<MaterialRow["state"], string> = { out: "text-red-700 font-semibold", low: "text-amber-800 font-semibold", ok: "text-slate-700" };

function Materials({ groups, canEdit }: { groups: Map<string, MaterialRow[]>; canEdit: boolean }) {
  return (
    <Panel
      title="כוננות חומרים ומלאי"
      href="/inventory"
      className="lg:col-span-2"
      aside={canEdit && <Link href="/inventory/quick" className="text-sm text-blue-700 underline">הזנה מהירה</Link>}
    >
      {groups.size === 0 ? (
        <p className="text-slate-600">עדיין לא הוזנו חומרים ופריטי מלאי.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...groups.entries()].map(([category, rows]) => (
            <div key={category}>
              <h3 className="mb-1 text-sm font-medium text-slate-600">{category}</h3>
              <ul className="space-y-1">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/inventory/${r.id}`} className="flex items-center justify-between gap-2 rounded-lg px-1 py-0.5 hover:bg-slate-50">
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${MATERIAL_DOT[r.state]}`} aria-hidden />
                        {r.name}
                      </span>
                      <span className={`tabular-nums ${MATERIAL_TEXT[r.state]}`}>{Number(r.quantity)} {r.unit}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">ירוק: יש מספיק · כתום: מתחת לסף המינימום · אדום: נגמר. הגלילים שטעונים בתוך המדפסות יוצגו כאן אחרי החיבור למדפסות.</p>
    </Panel>
  );
}

function Summary({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  const rows: [string, number, string][] = [
    ["תקלות פתוחות", stats.maintenance.openFaults, "/maintenance"],
    ["טיפולים באיחור", stats.maintenance.overdue, "/maintenance"],
    ["משימות פתוחות", stats.tasks.open, "/tasks"],
    ["משימות באיחור", stats.tasks.overdue, "/tasks"],
  ];
  return (
    <Panel title="בקצרה">
      <dl className="grid grid-cols-2 gap-2">
        {rows.map(([label, value, href]) => (
          <Link key={label} href={href} className="rounded-xl bg-slate-50 p-3 hover:bg-slate-100">
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="text-2xl font-bold tabular-nums">{value}</dd>
          </Link>
        ))}
      </dl>
    </Panel>
  );
}

async function DashboardContent() {
  const { organization, role } = await getOrgContext();

  if (!organization || !role || !can(role, "dashboard.view")) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
        המשתמש שלך עדיין לא משויך למעבדה. פנה למנהל המערכת.
      </p>
    );
  }

  const now = new Date();
  const [overview, stats] = await Promise.all([getOverview(db, organization.id, now), getDashboardStats(db, organization.id, now)]);

  return (
    <>
      <p className="-mt-4 mb-4 text-sm text-slate-500">נכון ל-{formatDateTime(now)}</p>
      <div className="grid gap-4 lg:grid-cols-3">
        <Alerts alerts={overview.alerts} />
        <Truck schedule={overview.schedule} canEdit={can(role, "activity.manage")} />
        <MachineBoard machines={overview.machines} />
        <Materials groups={overview.materials} canEdit={can(role, "inventory.issue")} />
        <Summary stats={stats} />
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="טוען נתונים">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-56 animate-pulse rounded-2xl bg-white" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">דשבורד</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}
