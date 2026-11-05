import { afterAll, describe, expect, it } from "vitest";
import { getMachineBoard } from "@/modules/dashboard/machine-board";
import { createEquipment } from "@/modules/equipment/service";
import { createInventoryItem, listInventory, recordStockMovement, updateInventoryItem } from "@/modules/inventory/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

async function setup() {
  const { org, user } = await createOrgWithAdmin(db);
  const actor = { organizationId: org.id, userId: user.id };
  const p1 = await createEquipment(db, actor, { name: "X2D 1", category: "3D" });
  const p2 = await createEquipment(db, actor, { name: "X2D 2", category: "3D" });
  const laser = await createEquipment(db, actor, { name: "Laser", category: "Laser" });
  return { org, actor, p1, p2, laser };
}

describe("inventory linked to machines", () => {
  it("links one item to several machines and filters by machine", async () => {
    const { org, actor, p1, p2, laser } = await setup();
    const pla = await createInventoryItem(db, actor, { name: "PLA black", category: "פילמנט", unit: "גליל", equipmentIds: [p1.id, p2.id] });
    await createInventoryItem(db, actor, { name: "Lens", category: "חלקי חילוף", unit: "יח'", equipmentIds: [laser.id] });
    expect((await listInventory(db, org.id, { equipmentId: p2.id })).map((i) => i.name)).toEqual(["PLA black"]);
    await updateInventoryItem(db, actor, pla.id, { name: "PLA black", category: "פילמנט", unit: "גליל", equipmentIds: [p1.id] });
    expect(await listInventory(db, org.id, { equipmentId: p2.id })).toEqual([]);
  });

  it("refuses machines from another organization", async () => {
    const a = await setup();
    const b = await setup();
    await expect(
      createInventoryItem(db, a.actor, { name: "Nozzle", category: "נחירים", unit: "יח'", equipmentIds: [b.p1.id] }),
    ).rejects.toThrow("אחת המכונות שנבחרו לא נמצאה");
    expect(await db.inventoryItem.count({ where: { organizationId: a.org.id } })).toBe(0);
  });

  it("shows low stock on the machines that use the item", async () => {
    const { org, actor, p1, laser } = await setup();
    const item = await createInventoryItem(db, actor, {
      name: "PETG", category: "פילמנט", unit: "גליל", initialQuantity: "3", minStockLevel: "2", quickStep: "1", equipmentIds: [p1.id],
    });
    let board = await getMachineBoard(db, org.id);
    expect(board.find((m) => m.id === p1.id)?.condition).toBe("ok");
    await recordStockMovement(db, actor, item.id, { type: "ISSUE", quantity: "2" });
    board = await getMachineBoard(db, org.id);
    const printer = board.find((m) => m.id === p1.id)!;
    expect(printer.condition).toBe("attention");
    expect(printer.lowStock).toEqual([{ id: item.id, name: "PETG", unit: "גליל", quantity: "1" }]);
    expect(board.find((m) => m.id === laser.id)?.lowStock).toEqual([]);
  });

  it("rejects a non-positive quick step at the database", async () => {
    const { actor } = await setup();
    const item = await createInventoryItem(db, actor, { name: "Blade", category: "להבים", unit: "יח'" });
    await expect(db.inventoryItem.update({ where: { id: item.id }, data: { quickStep: 0 } })).rejects.toThrow();
  });
});
