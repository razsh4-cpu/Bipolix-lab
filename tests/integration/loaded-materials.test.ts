import { afterAll, describe, expect, it } from "vitest";
import { buildAlerts, getOverview } from "@/modules/dashboard/overview";
import { createEquipment } from "@/modules/equipment/service";
import { InventoryItemInput } from "@/modules/inventory/schema";
import { createInventoryItem, updateInventoryItem } from "@/modules/inventory/service";
import { loadMaterial, unloadMaterial } from "@/modules/loaded/service";
import { reportFault } from "@/modules/maintenance/service";
import { createOrgWithAdmin, testDb } from "../helpers";

const db = testDb();
afterAll(() => db.$disconnect());

async function setup() {
  const { org, user } = await createOrgWithAdmin(db);
  const actor = { organizationId: org.id, userId: user.id };
  const printer = await createEquipment(db, actor, { name: "X2D 1", category: "3D" });
  return { org, actor, printer };
}

describe("material colour", () => {
  it("stores a lowercase hex colour and clears it on edit", async () => {
    const { actor } = await setup();
    const parsed = InventoryItemInput.parse({ name: "PLA", category: "פילמנט", unit: "גליל", color: "#FF6A13" });
    expect(parsed.color).toBe("#ff6a13");
    expect(InventoryItemInput.safeParse({ name: "PLA", category: "פילמנט", unit: "גליל", color: "red" }).success).toBe(false);

    const item = await createInventoryItem(db, actor, parsed);
    expect(item.color).toBe("#ff6a13");
    const edited = await updateInventoryItem(db, actor, item.id, { name: "PLA", category: "פילמנט", unit: "גליל" });
    expect(edited.color).toBeNull();
    await expect(db.inventoryItem.update({ where: { id: item.id }, data: { color: "#FFF" } })).rejects.toThrow();
  });
});

describe("loaded materials", () => {
  it("replaces what is in a slot, shows it on the board and the materials list, and unloads", async () => {
    const { org, actor, printer } = await setup();
    const black = await createInventoryItem(db, actor, { name: "PLA black", category: "פילמנט", unit: "גליל", initialQuantity: "3", color: "#000000" });
    const white = await createInventoryItem(db, actor, { name: "PLA white", category: "פילמנט", unit: "גליל", initialQuantity: "3" });

    await loadMaterial(db, actor, printer.id, { itemId: black.id, slot: "AMS 1 · 1" });
    await loadMaterial(db, actor, printer.id, { itemId: white.id, slot: "AMS 1 · 2" });
    // Swapping the spool in slot 1.
    const swapped = await loadMaterial(db, actor, printer.id, { itemId: white.id, slot: "AMS 1 · 1" });

    const o = await getOverview(db, org.id);
    const board = o.machines.find((m) => m.id === printer.id)!;
    expect(board.loaded.map((l) => [l.slot, l.item.name])).toEqual([["AMS 1 · 1", "PLA white"], ["AMS 1 · 2", "PLA white"]]);
    const rows = o.materials.get("פילמנט")!;
    expect(rows.find((r) => r.id === black.id)).toMatchObject({ color: "#000000", loadedIn: [] });
    expect(rows.find((r) => r.id === white.id)?.loadedIn).toEqual(["X2D 1 (AMS 1 · 1)", "X2D 1 (AMS 1 · 2)"]);

    await unloadMaterial(db, actor, swapped.id);
    expect(await db.loadedMaterial.count({ where: { equipmentId: printer.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { organizationId: org.id, action: { startsWith: "material." } } })).toBe(4);
  });

  it("refuses machines and materials of another organization", async () => {
    const a = await setup();
    const b = await setup();
    const item = await createInventoryItem(db, a.actor, { name: "Vinyl", category: "ויניל", unit: "גליל" });
    await expect(loadMaterial(db, a.actor, b.printer.id, { itemId: item.id })).rejects.toThrow("המכונה לא נמצאה");
    const other = await createInventoryItem(db, b.actor, { name: "Vinyl", category: "ויניל", unit: "גליל" });
    await expect(loadMaterial(db, a.actor, a.printer.id, { itemId: other.id })).rejects.toThrow("החומר שנבחר לא נמצא");
    const loaded = await loadMaterial(db, b.actor, b.printer.id, { itemId: other.id });
    await expect(unloadMaterial(db, a.actor, loaded.id)).rejects.toThrow("החומר כבר לא טעון");
  });
});

describe("dashboard alerts without repetition", () => {
  it("merges a machine's problems into one line and groups stock by state", async () => {
    const { org, actor, printer } = await setup();
    await reportFault(db, actor, { equipmentId: printer.id, severity: "CRITICAL", description: "nozzle clog" });
    await reportFault(db, actor, { equipmentId: printer.id, severity: "LOW", description: "noise" });
    await createInventoryItem(db, actor, { name: "A", category: "x", unit: "יח'" });
    await createInventoryItem(db, actor, { name: "B", category: "y", unit: "יח'" });
    await createInventoryItem(db, actor, { name: "C", category: "x", unit: "יח'", initialQuantity: "1", minStockLevel: "2" });

    const o = await getOverview(db, org.id);
    expect(o.alerts.map((a) => [a.level, a.text, a.href])).toEqual([
      ["critical", "X2D 1: תקלה קריטית פתוחה, לא הוגדר מי מטפל בתקלה", `/equipment/${printer.id}`],
      ["critical", "נגמר: A, B", "/dashboard#materials"],
      ["warning", "מלאי נמוך: C (1 יח')", expect.stringMatching(/^\/inventory\//)],
    ]);
    expect(buildAlerts([], new Map(), [], new Date())).toEqual([]);
  });
});
