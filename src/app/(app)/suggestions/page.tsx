import { Suspense } from "react";
import { Badge, Card, EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forms";
import { SUGGESTION_STATUS_LABELS, SUGGESTION_STATUS_TONES } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { createSuggestionAction, reviewSuggestionAction } from "@/modules/suggestions/actions";
import { SuggestionForm, SuggestionReviewForm } from "@/modules/suggestions/forms";
import { listSuggestions } from "@/modules/suggestions/service";

export const metadata = { title: "הצעות לשיפור — LabOps" };

async function Suggestions() {
  const ctx = await requirePermission("suggestion.view");
  const suggestions = await listSuggestions(db, ctx.organization.id);
  const canCreate = !ctx.isGuest && can(ctx.role, "suggestion.create");
  const canManage = !ctx.isGuest && can(ctx.role, "suggestion.manage");
  const open = suggestions.filter((s) => s.status === "NEW" || s.status === "PLANNED").length;

  return (
    <>
      <PageHeader title="הצעות לשיפור" />
      <p className="-mt-2 mb-4 text-sm text-slate-600">רעיון שיעשה את המערכת נוחה יותר? כתבו אותו כאן. כל הצוות רואה את ההצעות ואת התשובות.</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {canCreate && (
          <div className="lg:col-span-1">
            <Card title="הצעה חדשה">
              <SuggestionForm action={createSuggestionAction} />
            </Card>
          </div>
        )}
        <div className={canCreate ? "lg:col-span-2" : "lg:col-span-3"}>
          {suggestions.length === 0 ? (
            <EmptyState>עדיין אין הצעות.</EmptyState>
          ) : (
            <Card title={`כל ההצעות (${suggestions.length})${open ? ` · פתוחות: ${open}` : ""}`}>
              <ul className="divide-y divide-slate-100">
                {suggestions.map((s) => (
                  <li key={s.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{s.title}</div>
                        <div className="text-xs text-slate-500">{s.author.name} · {formatDate(s.createdAt)}</div>
                      </div>
                      <Badge tone={SUGGESTION_STATUS_TONES[s.status]}>{SUGGESTION_STATUS_LABELS[s.status]}</Badge>
                    </div>
                    {s.details && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{s.details}</p>}
                    {s.adminResponse && !canManage && (
                      <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">תגובה: {s.adminResponse}</p>
                    )}
                    {canManage && (
                      <SuggestionReviewForm action={reviewSuggestionAction.bind(null, s.id)} status={s.status} adminResponse={s.adminResponse} />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

export default function SuggestionsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Suggestions />
    </Suspense>
  );
}
