import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, ListSkeleton, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/labels";
import { requirePermission } from "@/lib/session";
import { addMemberAction } from "@/modules/users/actions";
import { NewMemberForm } from "@/modules/users/forms";
import { listMembers } from "@/modules/users/service";

export const metadata = { title: "משתמשים — LabOps" };

async function Users() {
  const ctx = await requirePermission("users.manage");
  const members = await listMembers(db, ctx.organization.id);
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
        <Card title="הוספת איש צוות">
          <NewMemberForm action={addMemberAction} />
        </Card>
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
