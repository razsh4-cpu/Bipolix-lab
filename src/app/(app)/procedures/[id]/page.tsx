import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, BUTTON_SECONDARY, Card, LinkButton, ListSkeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/forms";
import { PROCEDURE_KIND_LABELS, PROCEDURE_KIND_TONES } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { archiveProcedureAction } from "@/modules/procedures/actions";
import { getProcedure } from "@/modules/procedures/service";

async function ProcedureDetail({ params, searchParams }: PageProps<"/procedures/[id]">) {
  const ctx = await requirePermission("procedure.view");
  const { id } = await params;
  const sp = await searchParams;
  const p = await getProcedure(db, ctx.organization.id, id);
  if (!p) notFound();
  const requested = typeof sp.version === "string" ? Number(sp.version) : null;
  const shown = (requested && p.revisions.find((r) => r.version === requested)) || p.revisions[0];
  const isOld = shown && shown.version !== p.version;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/procedures" className="text-sm text-blue-700 underline">חזרה לנהלים</Link>
          <h1 className="mt-1 text-2xl font-bold">{shown?.title ?? p.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge tone={PROCEDURE_KIND_TONES[p.kind]}>{PROCEDURE_KIND_LABELS[p.kind]}</Badge>
            {p.equipment ? <Link href={`/equipment/${p.equipment.id}`} className="underline">{p.equipment.name}</Link> : <span>נוהל כללי למעבדה</span>}
            <span>· גרסה {shown?.version ?? p.version}</span>
          </div>
        </div>
        {can(ctx.role, "procedure.manage") && !isOld && (
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/procedures/${p.id}/edit`} variant="secondary">עריכה</LinkButton>
            <form action={archiveProcedureAction.bind(null, p.id)}>
              <button type="submit" className={BUTTON_SECONDARY}>העברה לארכיון</button>
            </form>
          </div>
        )}
      </div>
      {isOld && (
        <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
          זו גרסה קודמת ({shown.version}). <Link href={`/procedures/${p.id}`} className="underline">לגרסה הנוכחית ({p.version})</Link>
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="whitespace-pre-wrap leading-relaxed">{shown?.body ?? p.body}</div>
            <p className="mt-6 border-t border-slate-100 pt-3 text-sm text-slate-600">מקור: {shown?.source ?? p.source}</p>
          </Card>
        </div>
        <Card title="גרסאות">
          <ul className="space-y-2 text-sm">
            {p.revisions.map((r) => (
              <li key={r.id}>
                <Link href={r.version === p.version ? `/procedures/${p.id}` : `/procedures/${p.id}?version=${r.version}`} className={r.version === shown?.version ? "font-semibold" : "text-blue-700 underline"}>
                  גרסה {r.version}
                </Link>
                <span className="text-slate-500"> · {formatDateTime(r.createdAt)} · {r.editedBy.name}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

export default function ProcedurePage(props: PageProps<"/procedures/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ProcedureDetail {...props} />
    </Suspense>
  );
}
