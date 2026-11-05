import { afterAll, describe, expect, it } from "vitest";
import { addMember, listMembers, resetPassword, updateMember } from "@/modules/users/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

const staff = (email: string) => ({ name: "Staff", email, role: "VIEWER" as const, password: "first-password-1" });

describe("user management", () => {
  it("adds a viewer with a hashed password, only in the admin's organization", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const actor = { organizationId: a.org.id, userId: a.user.id };
    const email = `v-${a.org.id}@test.local`;
    const id = await addMember(db, actor, staff(email.toUpperCase()));
    const account = await db.account.findFirstOrThrow({ where: { userId: id } });
    expect(account.password).not.toContain("first-password-1");
    expect((await listMembers(db, a.org.id)).map((m) => m.user.email)).toContain(email);
    expect((await listMembers(db, b.org.id)).map((m) => m.user.email)).not.toContain(email);
    await expect(addMember(db, actor, staff(email))).rejects.toThrow("כבר קיים משתמש עם המייל הזה");
  });

  it("deactivates a member, signs them out, and keeps at least one active admin", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const id = await addMember(db, actor, staff(`d-${org.id}@test.local`));
    await db.session.create({ data: { id: `s-${id}`, userId: id, token: `t-${id}`, expiresAt: new Date(Date.now() + 3600e3) } });
    await updateMember(db, actor, id, { role: "VIEWER", isActive: false });
    expect((await db.user.findUniqueOrThrow({ where: { id } })).isActive).toBe(false);
    expect(await db.session.count({ where: { userId: id } })).toBe(0);

    await expect(updateMember(db, actor, user.id, { role: "VIEWER", isActive: true })).rejects.toThrow("אי אפשר לשנות");
    const other = await addMember(db, actor, { ...staff(`a-${org.id}@test.local`), role: "ADMIN" });
    await updateMember(db, { organizationId: org.id, userId: other }, user.id, { role: "ADMIN", isActive: false });
    await expect(updateMember(db, { organizationId: org.id, userId: user.id }, other, { role: "ADMIN", isActive: false })).rejects.toThrow();
  });

  it("resets a password and cannot touch users of another organization", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const id = await addMember(db, { organizationId: a.org.id, userId: a.user.id }, staff(`r-${a.org.id}@test.local`));
    const before = (await db.account.findFirstOrThrow({ where: { userId: id } })).password;
    await resetPassword(db, { organizationId: a.org.id, userId: a.user.id }, id, "second-password-2");
    expect((await db.account.findFirstOrThrow({ where: { userId: id } })).password).not.toBe(before);
    await expect(resetPassword(db, { organizationId: b.org.id, userId: b.user.id }, id, "third-password-3")).rejects.toThrow("המשתמש לא נמצא");
    await expect(updateMember(db, { organizationId: b.org.id, userId: b.user.id }, id, { role: "ADMIN", isActive: true })).rejects.toThrow("המשתמש לא נמצא");
  });
});
