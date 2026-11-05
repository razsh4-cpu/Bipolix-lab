import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, ListSkeleton } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { resetPasswordAction, updateMemberAction } from "@/modules/users/actions";
import { MemberForm, PasswordResetForm } from "@/modules/users/forms";
import { getMember } from "@/modules/users/service";

async function Member({ params, searchParams }: PageProps<"/users/[id]">) {
  const ctx = await requirePermission("users.manage");
  const { id } = await params;
  const sp = await searchParams;
  const m = await getMember(db, ctx.organization.id, id);
  if (!m) notFound();
  return (
    <>
      <Link href="/users" className="text-sm text-blue-700 underline">חזרה למשתמשים</Link>
      <h1 className="mb-1 mt-1 text-2xl font-bold">{m.user.name}</h1>
      <p className="mb-6 text-slate-600" dir="ltr">{m.user.email}</p>
      {sp.created === "1" && (
        <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-emerald-800">
          המשתמש נוצר. מסור לו את המייל ואת הסיסמה הראשונית, ואת הקישור לאתר.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="תפקיד וגישה">
          <MemberForm action={updateMemberAction.bind(null, id)} role={m.role} isActive={m.user.isActive} isSelf={id === ctx.user.id} />
        </Card>
        <Card title="החלפת סיסמה">
          <PasswordResetForm action={resetPasswordAction.bind(null, id)} />
        </Card>
      </div>
    </>
  );
}

export default function MemberPage(props: PageProps<"/users/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Member {...props} />
    </Suspense>
  );
}
