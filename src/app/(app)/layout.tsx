import Link from "next/link";
import { Suspense } from "react";
import { MainNav } from "@/components/main-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ROLE_LABELS } from "@/lib/labels";
import { getOrgContext } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/dashboard", label: "דשבורד", ready: true },
  { href: "/equipment", label: "ציוד", ready: true },
  { href: "/inventory", label: "מלאי", ready: true },
  { href: "/maintenance", label: "תקלות ותחזוקה", ready: true },
  { href: "/tasks", label: "משימות", ready: true },
] as const;

async function CurrentUser() {
  const { user, role, organization } = await getOrgContext();
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-left leading-tight" dir="auto">
        <div className="font-medium">{user.name}</div>
        <div className="text-slate-500">
          {organization?.name ?? "ללא ארגון"}
          {role && ` · ${ROLE_LABELS[role]}`}
        </div>
      </div>
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
        <MainNav items={NAV_ITEMS} />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
