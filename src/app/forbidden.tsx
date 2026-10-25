import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-2xl font-bold">אין לך הרשאה לדף הזה</h1>
      <p className="mt-2 text-slate-600">אם נראה לך שזו טעות, פנה למנהל המעבדה.</p>
      <Link href="/dashboard" className="mt-6 inline-block text-blue-700 underline">
        חזרה לדשבורד
      </Link>
    </main>
  );
}
