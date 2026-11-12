-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "color" TEXT;

-- CreateTable
CREATE TABLE "LoadedMaterial" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "slot" TEXT NOT NULL DEFAULT '',
    "loadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loadedById" TEXT NOT NULL,

    CONSTRAINT "LoadedMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoadedMaterial_organizationId_idx" ON "LoadedMaterial"("organizationId");

-- CreateIndex
CREATE INDEX "LoadedMaterial_itemId_idx" ON "LoadedMaterial"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadedMaterial_equipmentId_slot_key" ON "LoadedMaterial"("equipmentId", "slot");

-- AddForeignKey
ALTER TABLE "LoadedMaterial" ADD CONSTRAINT "LoadedMaterial_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadedMaterial" ADD CONSTRAINT "LoadedMaterial_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadedMaterial" ADD CONSTRAINT "LoadedMaterial_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadedMaterial" ADD CONSTRAINT "LoadedMaterial_loadedById_fkey" FOREIGN KEY ("loadedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_color_format"
  CHECK ("color" IS NULL OR "color" ~ '^#[0-9a-f]{6}$');
