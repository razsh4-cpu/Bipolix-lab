import { afterAll, describe, expect, it } from "vitest";
import { StockMovementInput } from "@/modules/inventory/schema";
import { createInventoryItem, listInventory, recordStockMovement } from "@/modules/inventory/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

async function setup(initialQuantity = "10") {
  const { org, user } = await createOrgWithAdmin(db);
  const actor = { organizationId: org.id, userId: user.id };
  const item = await createInventoryItem(db, actor, { name: "Plywood", category: "עץ", unit: "יח'", initialQuantity, minStockLevel: "5" });
  return { org, actor, item };
}

describe("inventory", () => {
  it("records the opening balance as a RECEIVE transaction", async () => {
    const { item } = await setup("10");
    const txs = await db.inventoryTransaction.findMany({ where: { itemId: item.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe("RECEIVE");
    expect(txs[0].balanceAfter.toString()).toBe("10");
  });

  it("receives, issues and adjusts with an exact running balance", async () => {
    const { actor, item } = await setup("10");
    await recordStockMovement(db, actor, item.id, { type: "RECEIVE", quantity: "2.5" });
    await recordStockMovement(db, actor, item.id, { type: "ISSUE", quantity: "0.125" });
    const adj = await recordStockMovement(db, actor, item.id, { type: "ADJUST", quantity: "11", reason: "ספירה" });
    expect(adj.quantityDelta.toString()).toBe("-1.375");
    const fresh = await db.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(fresh.quantity.toString()).toBe("11");
  });

  it("refuses to issue more than the balance", async () => {
    const { actor, item } = await setup("3");
    await expect(recordStockMovement(db, actor, item.id, { type: "ISSUE", quantity: "4" })).rejects.toThrow(/אין מספיק מלאי/);
    const fresh = await db.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(fresh.quantity.toString()).toBe("3");
  });

  it("stays consistent under 20 concurrent issues of 1 from a balance of 10", async () => {
    const { actor, item } = await setup("10");
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => recordStockMovement(db, actor, item.id, { type: "ISSUE", quantity: "1" })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    const fresh = await db.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(fresh.quantity.toString()).toBe("0");
    const issues = await db.inventoryTransaction.findMany({ where: { itemId: item.id, type: "ISSUE" }, orderBy: { createdAt: "asc" } });
    expect(issues.map((t) => Number(t.balanceAfter)).sort((a, b) => b - a)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  });

  it("cannot move stock of another organization", async () => {
    const { item } = await setup("10");
    const other = await createOrgWithAdmin(db);
    await expect(
      recordStockMovement(db, { organizationId: other.org.id, userId: other.user.id }, item.id, { type: "ISSUE", quantity: "1" }),
    ).rejects.toThrow("הפריט לא נמצא");
  });

  it("flags items below the minimum", async () => {
    const { org, actor, item } = await setup("10");
    await recordStockMovement(db, actor, item.id, { type: "ISSUE", quantity: "6" });
    expect((await listInventory(db, org.id, { lowOnly: true })).map((i) => i.name)).toEqual(["Plywood"]);
  });

  it("requires a reason for adjustments", () => {
    expect(StockMovementInput.safeParse({ type: "ADJUST", quantity: "3" }).success).toBe(false);
    expect(StockMovementInput.safeParse({ type: "ISSUE", quantity: "0" }).success).toBe(false);
    expect(StockMovementInput.safeParse({ type: "ISSUE", quantity: "-1" }).success).toBe(false);
  });
});
