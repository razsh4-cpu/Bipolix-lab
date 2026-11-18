import { Suspense } from "react";
import { Card, ListSkeleton, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/session";
import { createLabDocumentAction } from "@/modules/documents/actions";
import { LabDocumentForm } from "@/modules/documents/form";
import { blobConfigured } from "@/modules/documents/storage";

export const metadata = { title: "העלאת מסמך — LabOps" };

async function NewDocument() {
  const ctx = await requirePermission("document.manage");
  return (
    <>
      <PageHeader title="העלאת מסמך" />
      <Card>
        {blobConfigured() ? (
          <LabDocumentForm organizationId={ctx.organization.id} action={createLabDocumentAction} />
        ) : (
          <p className="text-sm text-amber-800">אחסון הקבצים עדיין לא הופעל ב-Vercel. אחרי ההפעלה אפשר יהיה להעלות מסמכים.</p>
        )}
      </Card>
    </>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <NewDocument />
    </Suspense>
  );
}
