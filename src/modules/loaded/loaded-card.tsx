import Link from "next/link";
import { ColorSwatch } from "@/components/color-swatch";
import { Card, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forms";
import { loadMaterialAction, unloadMaterialAction } from "./actions";
import { LoadMaterialForm } from "./load-form";
import { listLoadedForMachine } from "./service";

// "What is in the machine right now", on the machine page.
export async function LoadedMaterialsCard({
  organizationId,
  equipmentId,
  canEdit,
}: {
  organizationId: string;
  equipmentId: string;
  canEdit: boolean;
}) {
  const [loaded, items] = await Promise.all([
    listLoadedForMachine(db, organizationId, equipmentId),
    canEdit
      ? db.inventoryItem.findMany({
          where: { organizationId, archivedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true, machines: { where: { equipmentId }, select: { equipmentId: true } } },
        })
      : Promise.resolve([]),
  ]);
  const linked = items.filter((i) => i.machines.length > 0);
  const others = items.filter((i) => i.machines.length === 0);

  return (
    <Card title="טעון במכונה עכשיו">
      {loaded.length === 0 ? (
        <EmptyState>לא סומן חומר טעון.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {loaded.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <ColorSwatch color={l.item.color} />
                <Link href={`/inventory/${l.item.id}`} className="font-medium hover:underline">{l.item.name}</Link>
                {l.slot && <span className="text-sm text-slate-600" dir="ltr">{l.slot}</span>}
              </span>
              <span className="flex items-center gap-3 text-sm text-slate-500">
                <span>מאז {formatDate(l.loadedAt)}</span>
                {canEdit && (
                  <form action={unloadMaterialAction.bind(null, l.id)}>
                    <button type="submit" className="text-blue-700 underline">הוצאה</button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <details className="mt-3" open={loaded.length === 0}>
          <summary className="cursor-pointer text-sm text-blue-700 underline">סימון חומר שהוכנס למכונה</summary>
          <div className="mt-3">
            <LoadMaterialForm action={loadMaterialAction.bind(null, equipmentId)} linked={linked} others={others} />
          </div>
        </details>
      )}
    </Card>
  );
}
