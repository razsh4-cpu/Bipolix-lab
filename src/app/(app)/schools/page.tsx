import Link from "next/link";
import { Suspense } from "react";
import { Badge, BUTTON_SECONDARY, Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import type { PrintRequestStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forms";
import { PRINT_REQUEST_STATUS_LABELS, PRINT_REQUEST_STATUS_TONES } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { setPrintRequestStatusAction } from "@/modules/schools/actions";
import { listSchoolsWithRequests, PRINT_REQUEST_STATUS_ORDER } from "@/modules/schools/service";

export const metadata = { title: "בתי ספר — LabOps" };

const NEXT_STATUS: Partial<Record<PrintRequestStatus, PrintRequestStatus>> = {
  PENDING: "PRINTING",
  PRINTING: "PRINTED",
  PRINTED: "DELIVERED",
};

type Request = Awaited<ReturnType<typeof listSchoolsWithRequests>>[number]["printRequests"][number];

function RequestRow({ r, canManage, showLinks }: { r: Request; canManage: boolean; showLinks: boolean }) {
  const next = NEXT_STATUS[r.status];
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-line font-medium">{r.description}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {r.quantity != null && <span>כמות: {r.quantity}</span>}
            {r.filesUrl && showLinks && (
              <a href={r.filesUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">
                קבצי תלת־ממד ↗
              </a>
            )}
            <span>עודכן {formatDate(r.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={PRINT_REQUEST_STATUS_TONES[r.status]}>{PRINT_REQUEST_STATUS_LABELS[r.status]}</Badge>
          {canManage && <Link href={`/schools/requests/${r.id}/edit`} className="text-sm text-blue-700 underline">עריכה</Link>}
        </div>
      </div>
      {canManage && next && (
        <form action={setPrintRequestStatusAction.bind(null, r.id, next)} className="mt-2">
          <button type="submit" className={`${BUTTON_SECONDARY} !px-3 !py-1 text-xs`}>
            סימון: {PRINT_REQUEST_STATUS_LABELS[next]}
          </button>
        </form>
      )}
    </li>
  );
}

async function Schools() {
  const ctx = await requirePermission("school.view");
  const schools = await listSchoolsWithRequests(db, ctx.organization.id);
  const canManage = !ctx.isGuest && can(ctx.role, "school.manage");
  // Links to the schools' files are for signed-in staff, not the public view.
  const showLinks = !ctx.isGuest;
  const rank = (s: PrintRequestStatus) => PRINT_REQUEST_STATUS_ORDER.indexOf(s);

  return (
    <>
      <PageHeader title="בתי ספר — בקשות הדפסה" actions={canManage && <LinkButton href="/schools/new" variant="secondary">בית ספר חדש</LinkButton>} />
      <p className="-mt-2 mb-4 text-sm text-slate-600">מה כל בית ספר צריך שנדפיס עבורו, קישור לקבצים ומצב ההדפסה.</p>
      {schools.length === 0 ? (
        <EmptyState>
          עדיין לא נוספו בתי ספר.
          {canManage && <> <Link href="/schools/new" className="text-blue-700 underline">להוספת בית ספר</Link></>}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {schools.map((school) => {
            const open = school.printRequests.filter((r) => r.status !== "DELIVERED").sort((a, b) => rank(a.status) - rank(b.status));
            const delivered = school.printRequests.filter((r) => r.status === "DELIVERED").reverse();
            const waiting = open.filter((r) => r.status === "PENDING").length;
            return (
              <section key={school.id} id={`school-${school.id}`} className="scroll-mt-20">
                <Card
                  title={`${school.name}${waiting ? ` · ${waiting} ממתינות` : ""}`}
                  actions={
                    canManage && (
                      <div className="flex items-center gap-3">
                        <Link href={`/schools/${school.id}/edit`} className="text-xs text-slate-500 underline">שינוי שם</Link>
                        <LinkButton href={`/schools/requests/new?school=${school.id}`}>בקשה חדשה</LinkButton>
                      </div>
                    )
                  }
                >
                  {open.length === 0 ? (
                    <p className="py-2 text-sm text-slate-500">אין הדפסות פתוחות.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {open.map((r) => <RequestRow key={r.id} r={r} canManage={canManage} showLinks={showLinks} />)}
                    </ul>
                  )}
                  {delivered.length > 0 && (
                    <details className="mt-2 border-t border-slate-100 pt-2">
                      <summary className="cursor-pointer text-sm text-slate-600">נמסרו ({delivered.length})</summary>
                      <ul className="divide-y divide-slate-100">
                        {delivered.map((r) => <RequestRow key={r.id} r={r} canManage={canManage} showLinks={showLinks} />)}
                      </ul>
                    </details>
                  )}
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function SchoolsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Schools />
    </Suspense>
  );
}
