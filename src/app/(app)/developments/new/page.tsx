import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/session";
import { createDevelopmentAction } from "@/modules/developments/actions";
import { DevelopmentForm } from "@/modules/developments/form";

export const metadata = { title: "פיתוח חדש — LabOps" };

async function NewDevelopment() {
  await requirePermission("development.manage");
  return (
    <>
      <PageHeader title="פיתוח חדש" />
      <Card>
        <DevelopmentForm action={createDevelopmentAction} submitLabel="הוספה" />
      </Card>
    </>
  );
}

export default function NewDevelopmentPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <NewDevelopment />
    </Suspense>
  );
}
