import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { equipmentOptions } from "@/modules/maintenance/service";
import { createProcedureAction } from "@/modules/procedures/actions";
import { ProcedureForm } from "@/modules/procedures/forms";

export const metadata = { title: "נוהל חדש — LabOps" };

async function NewProcedure({ searchParams }: { searchParams: PageProps<"/procedures/new">["searchParams"] }) {
  const ctx = await requirePermission("procedure.manage");
  const sp = await searchParams;
  const equipment = await equipmentOptions(db, ctx.organization.id);
  return (
    <Card>
      <ProcedureForm
        action={createProcedureAction}
        equipment={equipment}
        defaultEquipmentId={typeof sp.equipmentId === "string" ? sp.equipmentId : undefined}
        submitLabel="שמירה"
      />
    </Card>
  );
}

export default function NewProcedurePage({ searchParams }: PageProps<"/procedures/new">) {
  return (
    <>
      <PageHeader title="נוהל חדש" />
      <Suspense fallback={<ListSkeleton />}>
        <NewProcedure searchParams={searchParams} />
      </Suspense>
    </>
  );
}
