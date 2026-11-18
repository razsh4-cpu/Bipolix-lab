import Link from "next/link";
import { Suspense } from "react";
import { Card, EmptyState, LinkButton, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forms";
import { LAB_DOCUMENT_CATEGORY_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { DeleteDocumentButton } from "@/modules/documents/delete-button";
import { LAB_DOCUMENT_CATEGORY_ORDER, listLabDocuments } from "@/modules/documents/service";
import { blobConfigured } from "@/modules/documents/storage";

export const metadata = { title: "מסמכים — LabOps" };

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fileKind(contentType: string) {
  if (contentType === "application/pdf") return "PDF";
  if (contentType.startsWith("image/")) return "תמונה";
  if (contentType.includes("word")) return "Word";
  if (contentType.includes("sheet") || contentType.includes("excel") || contentType === "text/csv") return "Excel";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "PowerPoint";
  return "קובץ";
}

async function Documents() {
  const ctx = await requirePermission("document.view");
  const canManage = !ctx.isGuest && can(ctx.role, "document.manage");

  if (ctx.isGuest) {
    return (
      <>
        <PageHeader title="מסמכים" />
        <EmptyState>
          המסמכים זמינים לצוות בלבד. <Link href="/login" className="text-blue-700 underline">כניסה</Link>
        </EmptyState>
      </>
    );
  }

  const items = await listLabDocuments(db, ctx.organization.id);
  const ready = blobConfigured();

  return (
    <>
      <PageHeader title="מסמכים" actions={canManage && ready && <LinkButton href="/documents/new">העלאת מסמך</LinkButton>} />
      <p className="-mt-2 mb-4 text-sm text-slate-600">מסמכים על המשאית: ממשרדים ורשויות, רשימות ציוד ועוד. גלוי לצוות המחובר בלבד.</p>
      {canManage && !ready && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">אחסון הקבצים עדיין לא הופעל ב-Vercel, לכן אי אפשר להעלות מסמכים כרגע.</p>
      )}
      {items.length === 0 ? (
        <EmptyState>
          עדיין לא הועלו מסמכים.
          {canManage && ready && <> <Link href="/documents/new" className="text-blue-700 underline">להעלאת המסמך הראשון</Link></>}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {LAB_DOCUMENT_CATEGORY_ORDER.map((category) => {
            const group = items.filter((d) => d.category === category);
            if (group.length === 0) return null;
            return (
              <Card key={category} title={`${LAB_DOCUMENT_CATEGORY_LABELS[category]} (${group.length})`}>
                <ul className="divide-y divide-slate-100">
                  {group.map((d) => (
                    <li key={d.id} className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <a href={`/api/documents/${d.id}/file`} target="_blank" rel="noopener" className="font-medium text-blue-800 hover:underline">{d.title}</a>
                          <div className="text-xs text-slate-500">
                            {[d.documentDate && `תאריך: ${formatDate(d.documentDate)}`, `${fileKind(d.contentType)} · ${fileSize(d.sizeBytes)}`, `הועלה ${formatDate(d.createdAt)} ע״י ${d.uploadedBy.name}`].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <a href={`/api/documents/${d.id}/file?download`} className="text-sm text-blue-700 underline">הורדה</a>
                          {canManage && <DeleteDocumentButton id={d.id} />}
                        </div>
                      </div>
                      {d.notes && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{d.notes}</p>}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Documents />
    </Suspense>
  );
}
