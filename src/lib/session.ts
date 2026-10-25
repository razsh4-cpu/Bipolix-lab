import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Permission } from "@/lib/permissions";

export type OrgContext = Awaited<ReturnType<typeof getOrgContext>>;

// Resolves the signed-in user and their active organization.
// Redirects to /login when there is no valid session.
export async function getOrgContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, isActive: true, isPlatformAdmin: true },
  });
  if (!user?.isActive) redirect("/login");

  // Single active organization per user for now; an organization switcher comes later.
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, organization: { select: { id: true, name: true } } },
  });

  return {
    user,
    role: membership?.role ?? null,
    organization: membership?.organization ?? null,
  };
}

// Server-side authorization gate. Never rely on the UI alone.
export async function requirePermission(permission: Permission) {
  const ctx = await getOrgContext();
  if (!ctx.organization || !ctx.role || !can(ctx.role, permission)) forbidden();
  return { ...ctx, organization: ctx.organization, role: ctx.role };
}
