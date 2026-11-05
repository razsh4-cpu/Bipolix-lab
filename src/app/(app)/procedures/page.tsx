import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forms";
import { PROCEDURE_KIND_LABELS, PROCEDURE_KIND_TONES } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listProcedures } from "@/modules/procedures/service";

export const metadata = { title: "נהלים — LabOps" };

type Row = Awaited<ReturnType<typeof listProcedures>>[number];

function ProcedureList({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((p) => (
        <li key={p.id}>
          <Link href={`/procedures/${p.id}`} className="flex flex-wrap items-center gap-2 py-3 hover:bg-slate-50">
            <Badge tone={PROCEDURE_KIND_TONES[p.kind]}>{PROCEDURE_KIND_LABELS[p.kind]}</Badge>
            <span className="font-medium">{p.title}</span>
            <span className="text-sm text-slate-500">גרסה {p.version} · עודכן {formatDate(p.updatedAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function Procedures() {
  const ctx = await requirePermission("procedure.view");
  const rows = await listProcedures(db, ctx.organization.id);
  const general = rows.filter((p) => !p.equipment);
  const byMachine = new Map<string, { name: string; rows: Row[] }>();
  for (const p of rows) {
    if (!p.equipment) continue;
    const group = byMachine.get(p.equipment.id) ?? { name: p.equipment.name, rows: [] };
    group.rows.push(p);
    byMachine.set(p.equipment.id, group);
  }

  return (
    <>
      <PageHeader title="נהלים" actions={can(ctx.role, "procedure.manage") && <LinkButton href="/procedures/new">נוהל חדש</LinkButton>} />
      {rows.length === 0 ? (
        <Card>
          <EmptyState>עדיין לא הוזנו נהלים. מזינים רק נהלים מאושרים או לפי הוראות היצרן.</EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card title="נהלים כלליים למעבדה">
            {general.length === 0 ? <EmptyState>אין נהלים כלליים.</EmptyState> : <ProcedureList rows={general} />}
          </Card>
          {[...byMachine.entries()].map(([id, g]) => (
            <Card key={id} title={g.name} actions={<Link href={`/equipment/${id}`} className="text-sm text-blue-700 underline">לכרטיס המכונה</Link>}>
              <ProcedureList rows={g.rows} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default function ProceduresPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Procedures />
    </Suspense>
  );
}
