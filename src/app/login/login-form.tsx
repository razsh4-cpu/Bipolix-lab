"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      setError(
        error.status === 429
          ? "יותר מדי ניסיונות התחברות. נסה שוב בעוד דקה."
          : "האימייל או הסיסמה שגויים, או שהמשתמש אינו פעיל.",
      );
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          אימייל
        </label>
        <input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-left focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          סיסמה
        </label>
        <input
          id="password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-left focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "מתחבר…" : "התחברות"}
      </button>
    </form>
  );
}
