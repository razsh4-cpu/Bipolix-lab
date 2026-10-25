import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { getOrgContext } from "@/lib/session";
import { getDashboardStats, type DashboardStats } from "@/modules/dashboard/stats";

export const metadata = { title: "דשבורד — LabOps" };

type Tone = "neutral" | "good" | "warn" | "bad";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "text-slate-900",
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-red-700",
};

function Metric({ label, value, tone = "neutral" }: { label: string; value: number | null; tone?: Tone }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className={`mt-1 text-3xl font-bold tabular-nums ${value ? TONE_CLASSES[tone] : "text-slate-900"}`}>
        {value ?? <span className="text-base font-normal text-slate-400">לא זמין עדיין</span>}
      </dd>
    </div>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">
        <Link href={href} className="hover:text-blue-800 hover:underline">{title}</Link>
      </h2>
      <dl className="grid grid-cols-2 gap-3">{children}</dl>
    </section>
  );
}

function Alerts({ stats }: { stats: DashboardStats }) {
  const { critical } = stats.equipment;
  const { lowStock, lowStockCount } = stats.inventory;
  if (critical.length === 0 && lowStockCount === 0) return null;

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2">
      {critical.length > 0 && (
        <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-900">ציוד עם תקלה קריטית פתוחה — לא זמין עד בדיקה</h2>
          <ul className="mt-2 space-y-1 text-sm text-red-900">
            {critical.map((e) => (
              <li key={e.id}>
                {e.name} · {EQUIPMENT_STATUS_LABELS[e.status]}
              </li>
            ))}
          </ul>
        </section>
      )}
      {lowStockCount > 0 && (
        <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">פריטים מתחת לסף המינימום ({lowStockCount})</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {lowStock.map((item) => (
              <li key={item.id}>
                {item.name}: {Number(item.quantity)} {item.unit} (מינימום {Number(item.minStockLevel)})
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
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

  const stats = await getDashboardStats(db, organization.id);
  const isEmpty =
    stats.equipment.total === 0 &&
    stats.inventory.total === 0 &&
    stats.maintenance.openFaults === 0 &&
    stats.tasks.open + stats.tasks.completed === 0;

  return (
    <>
      {isEmpty && (
        <p className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
          עדיין אין נתונים במערכת. המספרים יתעדכנו אוטומטית אחרי שיוזנו ציוד, פריטי מלאי, תקלות ומשימות.
        </p>
      )}
      <Alerts stats={stats} />
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="ציוד" href="/equipment">
          <Metric label="סה״כ מכונות" value={stats.equipment.total} />
          <Metric label="תקינות" value={stats.equipment.operational} tone="good" />
          <Metric label="מושבתות או בטיפול" value={stats.equipment.down} tone="bad" />
          <Metric label="דורשות טיפול" value={stats.equipment.needsAttention} tone="warn" />
        </Section>
        <Section title="מלאי" href="/inventory">
          <Metric label="פריטי מלאי" value={stats.inventory.total} />
          <Metric label="מתחת לסף מינימום" value={stats.inventory.lowStockCount} tone="warn" />
          <Metric label="הזמנות פתוחות" value={stats.inventory.openOrders} />
        </Section>
        <Section title="תקלות ותחזוקה" href="/maintenance">
          <Metric label="תקלות פתוחות" value={stats.maintenance.openFaults} tone="warn" />
          <Metric label="תקלות קריטיות" value={stats.maintenance.criticalFaults} tone="bad" />
          <Metric label="טיפולים מתוכננים" value={stats.maintenance.scheduled} />
          <Metric label="טיפולים באיחור" value={stats.maintenance.overdue} tone="bad" />
        </Section>
        <Section title="משימות" href="/tasks">
          <Metric label="פתוחות" value={stats.tasks.open} />
          <Metric label="באיחור" value={stats.tasks.overdue} tone="bad" />
          <Metric label="הושלמו" value={stats.tasks.completed} tone="good" />
        </Section>
      </div>
      <p className="mt-6 text-sm text-slate-500">
        נתוני פעילויות, משתתפים וניצולת ציוד יתווספו עם מודול הפעילויות.
      </p>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="טוען נתונים">
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
