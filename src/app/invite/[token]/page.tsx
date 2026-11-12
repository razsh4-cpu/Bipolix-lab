import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/labels";
import { acceptInvitationAction } from "@/modules/invitations/actions";
import { AcceptInvitationForm } from "@/modules/invitations/forms";
import { findUsableInvitation } from "@/modules/invitations/service";

export const metadata = { title: "הצטרפות — LabOps", robots: { index: false, follow: false } };

async function Invite({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params;
  const invitation = await findUsableInvitation(db, token);
  if (!invitation) {
    return (
      <>
        <h1 className="text-2xl font-bold">הקישור אינו בתוקף</h1>
        <p className="mt-2 text-sm text-slate-600">ייתכן שכבר נוצל, בוטל או שפג תוקפו. בקשו קישור חדש ממנהל המערכת.</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-blue-700 underline">למסך ההתחברות</Link>
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-bold">הצטרפות ל-LabOps</h1>
      <p className="mt-1 text-sm text-slate-600">
        הוזמנת ל{invitation.organization.name} בתפקיד {ROLE_LABELS[invitation.role]}. נשאר לבחור שם וסיסמה.
      </p>
      <AcceptInvitationForm action={acceptInvitationAction.bind(null, token)} email={invitation.email} />
    </>
  );
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Suspense fallback={<p className="text-sm text-slate-600">טוען…</p>}>
          <Invite params={params} />
        </Suspense>
      </div>
    </main>
  );
}
