import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { DomainError, type Actor } from "@/modules/types";
import { LoadMaterialInput } from "./schema";

const LOADED_SELECT = {
  id: true,
  slot: true,
  loadedAt: true,
  equipmentId: true,
  item: { select: { id: true, name: true, color: true, category: true } },
} as const;

export function listLoadedForMachine(db: PrismaClient, organizationId: string, equipmentId: string) {
  return db.loadedMaterial.findMany({
    where: { organizationId, equipmentId },
    orderBy: [{ slot: "asc" }],
    select: { ...LOADED_SELECT, loadedBy: { select: { name: true } } },
  });
}

export function listLoaded(db: PrismaClient, organizationId: string) {
  return db.loadedMaterial.findMany({
    where: { organizationId, equipment: { archivedAt: null } },
    orderBy: [{ slot: "asc" }],
    select: { ...LOADED_SELECT, equipment: { select: { name: true } } },
  });
}

// Loading into a slot that already holds something replaces it, as when a spool is swapped.
export function loadMaterial(db: PrismaClient, actor: Actor, equipmentId: string, input: LoadMaterialInput) {
  const { itemId, slot } = LoadMaterialInput.parse(input);
  return db.$transaction(async (tx) => {
    const [machine, item] = await Promise.all([
      tx.equipment.findFirst({ where: { id: equipmentId, organizationId: actor.organizationId, archivedAt: null }, select: { id: true } }),
      tx.inventoryItem.findFirst({ where: { id: itemId, organizationId: actor.organizationId, archivedAt: null }, select: { id: true, name: true } }),
    ]);
    if (!machine) throw new DomainError("המכונה לא נמצאה");
    if (!item) throw new DomainError("החומר שנבחר לא נמצא");
    const loaded = await tx.loadedMaterial.upsert({
      where: { equipmentId_slot: { equipmentId, slot } },
      create: { organizationId: actor.organizationId, equipmentId, itemId, slot, loadedById: actor.userId },
      update: { itemId, loadedAt: new Date(), loadedById: actor.userId },
    });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "material.load",
      entityType: "Equipment",
      entityId: equipmentId,
      details: { itemId, item: item.name, slot },
    });
    return loaded;
  });
}

export function unloadMaterial(db: PrismaClient, actor: Actor, loadedId: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.loadedMaterial.findFirst({ where: { id: loadedId, organizationId: actor.organizationId } });
    if (!existing) throw new DomainError("החומר כבר לא טעון");
    await tx.loadedMaterial.delete({ where: { id: loadedId } });
    await writeAudit(tx, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: "material.unload",
      entityType: "Equipment",
      entityId: existing.equipmentId,
      details: { itemId: existing.itemId, slot: existing.slot },
    });
  });
}
