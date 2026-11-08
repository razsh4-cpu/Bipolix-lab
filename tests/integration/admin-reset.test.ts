import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { afterAll, describe, expect, it } from "vitest";
import { resetAdmin } from "../../scripts/lib/setup";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

const input = (email: string, slug: string, password = "new-password-123") => ({
  email,
  name: "Recovered",
  password,
  org: "ignored when the org exists",
  slug,
  labType: "MOBILE" as const,
});

async function passwordOf(userId: string) {
  return (await db.account.findFirstOrThrow({ where: { userId, providerId: "credential" } })).password!;
}

describe("admin reset", () => {
  it("replaces an existing user's password, reactivates, makes admin and signs out", async () => {
    const { org } = await createOrgWithAdmin(db);
    const id = randomUUID();
    const email = `lost-${id}@test.local`;
    await db.user.create({ data: { id, name: "Lost", email, isActive: false } });
    await db.account.create({ data: { id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: "old" } });
    await db.membership.create({ data: { userId: id, organizationId: org.id, role: "VIEWER" } });
    await db.session.create({ data: { id: `s-${id}`, userId: id, token: `t-${id}`, expiresAt: new Date(Date.now() + 3600e3) } });
    const before = { items: await db.equipment.count(), users: await db.user.count() };

    expect(await resetAdmin(db, input(email.toUpperCase(), org.slug))).toBe("reset");

    expect(await verifyPassword({ hash: await passwordOf(id), password: "new-password-123" })).toBe(true);
    expect((await db.user.findUniqueOrThrow({ where: { id } })).isActive).toBe(true);
    expect((await db.membership.findFirstOrThrow({ where: { userId: id, organizationId: org.id } })).role).toBe("ADMIN");
    expect(await db.session.count({ where: { userId: id } })).toBe(0);
    expect(await db.auditLog.count({ where: { entityId: id, action: "user.admin_reset" } })).toBe(1);
    expect({ items: await db.equipment.count(), users: await db.user.count() }).toEqual(before);
  });

  it("creates a new admin in the existing organization when the email is unknown", async () => {
    const { org } = await createOrgWithAdmin(db);
    const email = `new-${org.id}@test.local`;
    expect(await resetAdmin(db, input(email, org.slug))).toBe("created");
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect((await db.membership.findFirstOrThrow({ where: { userId: user.id } })).organizationId).toBe(org.id);
    expect(await verifyPassword({ hash: await passwordOf(user.id), password: "new-password-123" })).toBe(true);
  });

  it("rejects a short password", async () => {
    const { org } = await createOrgWithAdmin(db);
    await expect(resetAdmin(db, input(`x-${org.id}@test.local`, org.slug, "short"))).rejects.toThrow("at least 10");
  });
});
