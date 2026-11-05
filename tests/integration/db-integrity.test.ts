import { afterAll, describe, expect, it } from "vitest";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

describe("database integrity rules", () => {
  it("rejects a negative inventory balance", async () => {
    const { org } = await createOrgWithAdmin(db);
    await expect(
      db.inventoryItem.create({ data: { organizationId: org.id, name: "x", category: "c", unit: "u", quantity: -1 } }),
    ).rejects.toThrow();
  });

  it("keeps inventory transactions append-only", async () => {
    const { org, user } = await createOrgWithAdmin(db);
    const item = await db.inventoryItem.create({
      data: { organizationId: org.id, name: "x", category: "c", unit: "u", quantity: 5 },
    });
    const tx = await db.inventoryTransaction.create({
      data: { organizationId: org.id, itemId: item.id, type: "RECEIVE", quantityDelta: 5, balanceAfter: 5, userId: user.id },
    });
    await expect(db.inventoryTransaction.update({ where: { id: tx.id }, data: { reason: "edit" } })).rejects.toThrow(/append-only/);
    await expect(db.inventoryTransaction.delete({ where: { id: tx.id } })).rejects.toThrow(/append-only/);
  });

  it("keeps the audit log append-only", async () => {
    const { org } = await createOrgWithAdmin(db);
    const log = await db.auditLog.create({ data: { organizationId: org.id, action: "test", entityType: "Test" } });
    await expect(db.auditLog.delete({ where: { id: log.id } })).rejects.toThrow(/append-only/);
  });
});
