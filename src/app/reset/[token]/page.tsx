import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { setNewPasswordAction } from "@/modules/password-reset/actions";
import { NewPasswordForm } from "@/modules/password-reset/forms";
import { findUsableResetLink } from "@/modules/password-reset/service";

export const metadata = { title: "סיסמה חדשה — LabOps", robots: { index: false, follow: false } };

async function Reset({ params }: { params: PageProps<"/reset/[token]">["params"] }) {
  const { token } = await params;
  // Link validity depends on the current time, so render per request.
  await connection();
  const link = await findUsableResetLink(db, token);
  if (!link) {
    return (
      <>
        <h1 className="text-2xl font-bold">הקישור אינו בתוקף</h1>
        <p className="mt-2 text-sm text-slate-600">ייתכן שכבר נוצל, הוחלף בקישור חדש או שפג תוקפו. בקשו קישור חדש ממנהל המערכת.</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-blue-700 underline">למסך ההתחברות</Link>
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-bold">בחירת סיסמה חדשה</h1>
      <p className="mt-1 text-sm text-slate-600">שלום {link.user.name}, בחרו סיסמה חדשה לכניסה ל-LabOps.</p>
      <NewPasswordForm action={setNewPasswordAction.bind(null, token)} email={link.user.email} />
    </>
  );
}

export default function ResetPage({ params }: PageProps<"/reset/[token]">) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Suspense fallback={<p className="text-sm text-slate-600">טוען…</p>}>
          <Reset params={params} />
        </Suspense>
      </div>
    </main>
  );
}
