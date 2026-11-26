import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createPasswordResetLink, findUsableResetLink, hashResetToken, redeemPasswordResetLink } from "@/modules/password-reset/service";
import { NewPasswordInput } from "@/modules/password-reset/schema";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

const NOW = new Date("2026-11-26T10:00:00Z");
const fresh = { password: "brand-new-pass-1", confirmPassword: "brand-new-pass-1" };

async function memberWithPassword(organizationId: string) {
  const id = randomUUID();
  const user = await db.user.create({ data: { id, name: "Instructor", email: `m-${id}@test.local` } });
  await db.membership.create({ data: { userId: id, organizationId, role: "INSTRUCTOR" } });
  await db.account.create({ data: { id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: "old-hash" } });
  await db.session.create({ data: { id: randomUUID(), token: randomUUID(), userId: id, expiresAt: new Date(NOW.getTime() + 3600e3) } });
  return user;
}

describe("password reset links", () => {
  it("lets the person set a new password once and signs them out", async () => {
    const { org, user: admin } = await createOrgWithAdmin(db);
    const member = await memberWithPassword(org.id);
    const actor = { organizationId: org.id, userId: admin.id };

    const { link, token, email } = await createPasswordResetLink(db, actor, member.id, NOW);
    expect(email).toBe(member.email);
    expect(link.tokenHash).toBe(hashResetToken(token));
    expect((await findUsableResetLink(db, token, NOW))?.user.email).toBe(member.email);

    await redeemPasswordResetLink(db, token, fresh, NOW);
    const account = await db.account.findFirstOrThrow({ where: { userId: member.id, providerId: "credential" } });
    expect(await verifyPassword({ hash: account.password!, password: fresh.password })).toBe(true);
    expect(await db.session.count({ where: { userId: member.id } })).toBe(0);

    expect(await findUsableResetLink(db, token, NOW)).toBeNull();
    await expect(redeemPasswordResetLink(db, token, fresh, NOW)).rejects.toThrow("הקישור אינו בתוקף");
  });

  it("rejects expired and replaced links", async () => {
    const { org, user: admin } = await createOrgWithAdmin(db);
    const member = await memberWithPassword(org.id);
    const actor = { organizationId: org.id, userId: admin.id };

    const first = await createPasswordResetLink(db, actor, member.id, NOW);
    const second = await createPasswordResetLink(db, actor, member.id, NOW);
    expect(await findUsableResetLink(db, first.token, NOW)).toBeNull();
    expect(await findUsableResetLink(db, second.token, NOW)).not.toBeNull();

    const later = new Date(NOW.getTime() + 25 * 3600e3);
    await expect(redeemPasswordResetLink(db, second.token, fresh, later)).rejects.toThrow("הקישור אינו בתוקף");
  });

  it("refuses other organizations' members and disabled users", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const member = await memberWithPassword(a.org.id);
    await expect(createPasswordResetLink(db, { organizationId: b.org.id, userId: b.user.id }, member.id, NOW)).rejects.toThrow("המשתמש לא נמצא");

    const actor = { organizationId: a.org.id, userId: a.user.id };
    const { token } = await createPasswordResetLink(db, actor, member.id, NOW);
    await db.user.update({ where: { id: member.id }, data: { isActive: false } });
    expect(await findUsableResetLink(db, token, NOW)).toBeNull();
    await expect(createPasswordResetLink(db, actor, member.id, NOW)).rejects.toThrow("מושבת");
  });

  it("validates the new password", () => {
    expect(NewPasswordInput.safeParse({ password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(NewPasswordInput.safeParse({ password: "long-enough-1", confirmPassword: "different-12" }).success).toBe(false);
    expect(NewPasswordInput.safeParse(fresh).success).toBe(true);
  });
});
