import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { updateDevelopmentAction } from "@/modules/developments/actions";
import { DevelopmentForm } from "@/modules/developments/form";
import { getDevelopment } from "@/modules/developments/service";

export const metadata = { title: "עריכת פיתוח — LabOps" };

async function EditDevelopment({ params }: { params: PageProps<"/developments/[id]/edit">["params"] }) {
  const ctx = await requirePermission("development.manage");
  const { id } = await params;
  const development = await getDevelopment(db, ctx.organization.id, id);
  if (!development) notFound();
  return (
    <>
      <PageHeader title={`עריכה: ${development.title}`} />
      <Card>
        <DevelopmentForm action={updateDevelopmentAction.bind(null, development.id)} development={development} submitLabel="שמירה" />
      </Card>
    </>
  );
}

export default function EditDevelopmentPage({ params }: PageProps<"/developments/[id]/edit">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EditDevelopment params={params} />
    </Suspense>
  );
}
