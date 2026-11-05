import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Permission } from "@/lib/permissions";

export type OrgContext = Awaited<ReturnType<typeof getOrgContext>>;

const GUEST = { id: "guest", name: "צפייה ציבורית", email: "", isActive: true, isPlatformAdmin: false };

// Read-only access without login, switched on by setting PUBLIC_VIEW_ORG_SLUG.
// A guest is a VIEWER of that organization; every write still needs a login.
async function guestContext() {
  const slug = process.env.PUBLIC_VIEW_ORG_SLUG?.trim();
  if (!slug) return null;
  const organization = await db.organization.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!organization) return null;
  return { user: GUEST, role: "VIEWER" as const, organization, isGuest: true };
}

// Resolves the signed-in user and their active organization.
// Without a session: a guest context when public viewing is on, otherwise /login.
export async function getOrgContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const guest = await guestContext();
    if (guest) return guest;
    redirect("/login");
  }

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
    isGuest: false,
  };
}

// Server-side authorization gate. Never rely on the UI alone.
export async function requirePermission(permission: Permission) {
  const ctx = await getOrgContext();
  if (!ctx.organization || !ctx.role || !can(ctx.role, permission)) {
    // A guest asking for more than viewing is sent to log in.
    if (ctx.isGuest) redirect("/login");
    forbidden();
  }
  return { ...ctx, organization: ctx.organization, role: ctx.role };
}
