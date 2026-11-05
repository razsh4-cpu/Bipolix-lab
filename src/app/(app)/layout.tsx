import Link from "next/link";
import { Suspense } from "react";
import { MainNav, NavList } from "@/components/main-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ROLE_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { getOrgContext } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/dashboard", label: "דשבורד", ready: true },
  { href: "/schedule", label: "לו״ז משאית", ready: true },
  { href: "/equipment", label: "ציוד", ready: true },
  { href: "/inventory", label: "מלאי", ready: true },
  { href: "/maintenance", label: "תקלות ותחזוקה", ready: true },
  { href: "/tasks", label: "משימות", ready: true },
  { href: "/procedures", label: "נהלים", ready: true },
] as const;

async function CurrentUser() {
  const { user, role, organization, isGuest } = await getOrgContext();
  if (isGuest) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="text-left leading-tight" dir="auto">
          <div className="font-medium">{organization?.name}</div>
          <div className="text-slate-500">צפייה בלבד</div>
        </div>
        <Link href="/login" className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">כניסה</Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-left leading-tight" dir="auto">
        <div className="font-medium">{user.name}</div>
        <div className="text-slate-500">
          {organization?.name ?? "ללא ארגון"}
          {role && ` · ${ROLE_LABELS[role]}`}
        </div>
      </div>
      {role && can(role, "users.manage") && (
        <Link href="/users" className="text-blue-700 underline">משתמשים</Link>
      )}
      <SignOutButton />
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="text-lg font-bold text-blue-800">
            LabOps
          </Link>
          <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded bg-slate-100" />}>
            <CurrentUser />
          </Suspense>
        </div>
        <Suspense fallback={<NavList items={NAV_ITEMS} pathname="" />}>
          <MainNav items={NAV_ITEMS} />
        </Suspense>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
