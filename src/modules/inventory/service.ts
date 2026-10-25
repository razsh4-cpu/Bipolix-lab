import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import type { InventoryItemInput, NewInventoryItemInput, StockMovementInput } from "./schema";

export type InventoryFilters = { q?: string; category?: string; lowOnly?: boolean };

export async function listInventory(db: PrismaClient, organizationId: string, filters: InventoryFilters = {}) {
  const where: Prisma.InventoryItemWhereInput = { organizationId, archivedAt: null };
  if (filters.category) where.category = filters.category;
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    where.OR = [{ name: contains }, { supplier: contains }, { storageLocation: contains }];
  }
  const items = await db.inventoryItem.findMany({ where, orderBy: { name: "asc" } });
  const withFlag = items.map((i) => ({ ...i, isLow: i.minStockLevel !== null && i.quantity.lessThan(i.minStockLevel) }));
  return filters.lowOnly ? withFlag.filter((i) => i.isLow) : withFlag;
}

export async function listInventoryCategories(db: PrismaClient, organizationId: string) {
  const rows = await db.inventoryItem.findMany({
    where: { organizationId, archivedAt: null },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}

export function getInventoryItem(db: PrismaClient, organizationId: string, id: string) {
  return db.inventoryItem.findFirst({
    where: { id, organizationId },
    include: {
      lab: { select: { name: true } },
      transactions: { orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } } } },
    },
  });
}

async function assertLabInOrg(tx: Prisma.TransactionClient, organizationId: string, labId?: string) {
  if (!labId) return;
  const lab = await tx.lab.findFirst({ where: { id: labId, organizationId }, select: { id: true } });
  if (!lab) throw new DomainError("המעבדה שנבחרה לא קיימת");
}

export function createInventoryItem(db: PrismaClient, actor: Actor, input: NewInventoryItemInput) {
  const { initialQuantity, ...data } = input;
  return db.$transaction(async (tx) => {
    await assertLabInOrg(tx, actor.organizationId, data.labId);
    const quantity = initialQuantity ?? "0";
    const item = await tx.inventoryItem.create({ data: { ...data, quantity, organizationId: actor.organizationId } });
    if (Number(quantity) > 0) {
      await tx.inventoryTransaction.create({
        data: {
          organizationId: actor.organizationId,
          itemId: item.id,
          type: "RECEIVE",
          quantityDelta: quantity,
          balanceAfter: quantity,
          reason: "יתרת פתיחה",
          userId: actor.userId,
        },
      });
    }
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "inventory.create",
      entityType: "InventoryItem",
      entityId: item.id,
      details: { name: item.name, initialQuantity: quantity },
    });
    return item;
  });
}

// Quantity is never edited here: it changes only through stock movements.
export function updateInventoryItem(db: PrismaClient, actor: Actor, id: string, input: InventoryItemInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.inventoryItem.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("הפריט לא נמצא");
    await assertLabInOrg(tx, actor.organizationId, input.labId);
    const item = await tx.inventoryItem.update({
      where: { id },
      data: { labId: null, minStockLevel: null, storageLocation: null, supplier: null, unitCost: null, notes: null, ...input },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "inventory.update",
      entityType: "InventoryItem",
      entityId: id,
    });
    return item;
  });
}

// Applies one stock movement atomically. The row lock serialises concurrent
// movements on the same item, and the balance can never drop below zero.
export function recordStockMovement(db: PrismaClient, actor: Actor, itemId: string, movement: StockMovementInput) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ quantity: string }[]>`
      SELECT "quantity"::text AS "quantity" FROM "InventoryItem"
      WHERE "id" = ${itemId} AND "organizationId" = ${actor.organizationId} AND "archivedAt" IS NULL
      FOR UPDATE`;
    if (rows.length === 0) throw new DomainError("הפריט לא נמצא");

    const current = rows[0].quantity;
    const delta = await deltaFor(tx, movement, current);
    if (delta === null) throw new DomainError("הכמות שנספרה זהה ליתרה הנוכחית");

    const updated = await tx.$queryRaw<{ quantity: string }[]>`
      UPDATE "InventoryItem"
      SET "quantity" = "quantity" + ${delta}::numeric, "updatedAt" = now()
      WHERE "id" = ${itemId} AND "quantity" + ${delta}::numeric >= 0
      RETURNING "quantity"::text AS "quantity"`;
    if (updated.length === 0) throw new DomainError(`אין מספיק מלאי. היתרה הנוכחית: ${Number(current)}`);

    const balanceAfter = updated[0].quantity;
    const transaction = await tx.inventoryTransaction.create({
      data: {
        organizationId: actor.organizationId,
        itemId,
        type: movement.type,
        quantityDelta: delta,
        balanceAfter,
        reason: movement.reason,
        userId: actor.userId,
      },
    });
    if (movement.type === "ADJUST") {
      await writeAudit(tx, {
        organizationId: actor.organizationId,
        actorId: actor.userId,
        action: "inventory.adjust",
        entityType: "InventoryItem",
        entityId: itemId,
        details: { from: current, to: balanceAfter, reason: movement.reason },
      });
    }
    return transaction;
  });
}

// Signed delta as an exact decimal string, computed in PostgreSQL to avoid float rounding.
async function deltaFor(tx: Prisma.TransactionClient, movement: StockMovementInput, current: string) {
  if (movement.type === "RECEIVE") return movement.quantity;
  if (movement.type === "ISSUE") return `-${movement.quantity}`;
  const [{ delta }] = await tx.$queryRaw<{ delta: string }[]>`
    SELECT (${movement.quantity}::numeric - ${current}::numeric)::text AS "delta"`;
  return Number(delta) === 0 ? null : delta;
}

export function archiveInventoryItem(db: PrismaClient, actor: Actor, id: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.inventoryItem.findFirst({ where: { id, organizationId: actor.organizationId, archivedAt: null } });
    if (!existing) throw new DomainError("הפריט לא נמצא");
    await tx.inventoryItem.update({ where: { id }, data: { archivedAt: new Date() } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "inventory.archive",
      entityType: "InventoryItem",
      entityId: id,
    });
  });
}
