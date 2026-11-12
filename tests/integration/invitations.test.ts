import { afterAll, describe, expect, it } from "vitest";
import { acceptInvitation, createInvitation, findUsableInvitation, hashInvitationToken, listPendingInvitations, revokeInvitation } from "@/modules/invitations/service";
import { AcceptInvitationInput } from "@/modules/invitations/schema";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

const NOW = new Date("2026-11-12T10:00:00Z");
const joiner = { name: "New Instructor", password: "chosen-password-1", confirmPassword: "chosen-password-1" };

describe("invitations", () => {
  it("creates a one-time link that adds the person with the invited role", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const email = `Inv-${org.id}@Test.local`;
    const { invitation, token } = await createInvitation(db, actor, { email, role: "INSTRUCTOR" }, NOW);

    expect(invitation.email).toBe(email.toLowerCase());
    expect(invitation.tokenHash).toBe(hashInvitationToken(token));
    expect(invitation.tokenHash).not.toContain(token);
    expect((await listPendingInvitations(db, org.id, NOW)).map((i) => i.id)).toEqual([invitation.id]);
    expect((await findUsableInvitation(db, token, NOW))?.organization.name).toBe(org.name);

    await acceptInvitation(db, token, joiner, NOW);
    const created = await db.user.findUniqueOrThrow({ where: { email: email.toLowerCase() }, include: { memberships: true, accounts: true } });
    expect(created.name).toBe("New Instructor");
    expect(created.memberships).toMatchObject([{ organizationId: org.id, role: "INSTRUCTOR" }]);
    expect(created.accounts[0].password).not.toContain("chosen-password-1");

    // Used links are dead.
    expect(await findUsableInvitation(db, token, NOW)).toBeNull();
    await expect(acceptInvitation(db, token, joiner, NOW)).rejects.toThrow("הקישור אינו בתוקף");
    expect(await listPendingInvitations(db, org.id, NOW)).toEqual([]);
  });

  it("rejects expired, revoked and replaced links, and existing users", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const actor = { organizationId: org.id, userId: user.id };
    const email = `exp-${org.id}@test.local`;

    const first = await createInvitation(db, actor, { email, role: "VIEWER" }, NOW);
    const second = await createInvitation(db, actor, { email, role: "VIEWER" }, NOW);
    expect(await findUsableInvitation(db, first.token, NOW)).toBeNull();
    expect(await findUsableInvitation(db, second.token, NOW)).not.toBeNull();

    const later = new Date(NOW.getTime() + 8 * 24 * 3600e3);
    await expect(acceptInvitation(db, second.token, joiner, later)).rejects.toThrow("הקישור אינו בתוקף");

    await revokeInvitation(db, actor, second.invitation.id, NOW);
    await expect(acceptInvitation(db, second.token, joiner, NOW)).rejects.toThrow("הקישור אינו בתוקף");

    await expect(createInvitation(db, actor, { email: user.email, role: "VIEWER" }, NOW)).rejects.toThrow("כבר קיים משתמש");
  });

  it("cannot revoke another organization's invitation", async () => {
    const a = await createOrgWithAdmin(db);
    const b = await createOrgWithAdmin(db);
    const { invitation } = await createInvitation(db, { organizationId: a.org.id, userId: a.user.id }, { email: `x-${a.org.id}@test.local`, role: "VIEWER" }, NOW);
    await expect(revokeInvitation(db, { organizationId: b.org.id, userId: b.user.id }, invitation.id, NOW)).rejects.toThrow();
  });

  it("requires matching passwords of at least 10 characters", () => {
    expect(AcceptInvitationInput.safeParse({ name: "a", password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(AcceptInvitationInput.safeParse({ name: "a", password: "long-enough-1", confirmPassword: "different-12" }).success).toBe(false);
    expect(AcceptInvitationInput.safeParse({ name: "a", password: "long-enough-1", confirmPassword: "long-enough-1" }).success).toBe(true);
  });
});
