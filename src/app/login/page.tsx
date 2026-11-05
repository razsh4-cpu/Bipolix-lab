import { LoginForm } from "./login-form";

export const metadata = { title: "התחברות — LabOps" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">LabOps</h1>
        <p className="mt-1 text-sm text-slate-600">התחברות למערכת ניהול המעבדה</p>
        <LoginForm />
      </div>
    </main>
  );
}
