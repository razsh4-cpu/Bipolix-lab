import Link from "next/link";
import { Suspense } from "react";
import { Badge, BUTTON_SECONDARY, Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forms";
import { ROLE_LABELS } from "@/lib/labels";
import { requirePermission } from "@/lib/session";
import { addMemberAction } from "@/modules/users/actions";
import { NewMemberForm } from "@/modules/users/forms";
import { listMembers } from "@/modules/users/service";
import { createInvitationAction, revokeInvitationAction } from "@/modules/invitations/actions";
import { InvitationForm } from "@/modules/invitations/forms";
import { listPendingInvitations } from "@/modules/invitations/service";

export const metadata = { title: "משתמשים — LabOps" };

async function Users() {
  const ctx = await requirePermission("users.manage");
  const [members, invitations] = await Promise.all([
    listMembers(db, ctx.organization.id),
    listPendingInvitations(db, ctx.organization.id),
  ]);
  return (
    <>
      <PageHeader title="משתמשים" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`צוות (${members.length})`}>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.user.id}>
                <Link href={`/users/${m.user.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-medium">{m.user.name}</div>
                    <div className="text-sm text-slate-500" dir="ltr">{m.user.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={m.role === "ADMIN" ? "blue" : "slate"}>{ROLE_LABELS[m.role]}</Badge>
                    {!m.user.isActive && <Badge tone="red">מושבת</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card title="הזמנת משתמש חדש">
            <p className="mb-3 text-sm text-slate-600">יוצרים קישור הזמנה אישי ושולחים אותו למייל של האדם. הוא בוחר שם וסיסמה בעצמו.</p>
            <InvitationForm action={createInvitationAction} orgName={ctx.organization.name} />
          </Card>
          {invitations.length > 0 && (
            <Card title={`הזמנות ממתינות (${invitations.length})`}>
              <ul className="divide-y divide-slate-100">
                {invitations.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium" dir="ltr">{i.email}</div>
                      <div className="text-xs text-slate-500">{ROLE_LABELS[i.role]} · בתוקף עד {formatDate(i.expiresAt)}</div>
                    </div>
                    <form action={revokeInvitationAction.bind(null, i.id)}>
                      <button type="submit" className={BUTTON_SECONDARY}>ביטול הזמנה</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="הוספה ידנית עם סיסמה">
            <NewMemberForm action={addMemberAction} />
          </Card>
        </div>
      </div>
    </>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Users />
    </Suspense>
  );
}
