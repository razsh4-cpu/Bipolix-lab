-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "quickStep" DECIMAL(12,3) NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "InventoryItemEquipment" (
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "InventoryItemEquipment_pkey" PRIMARY KEY ("itemId","equipmentId")
);

-- CreateIndex
CREATE INDEX "InventoryItemEquipment_equipmentId_idx" ON "InventoryItemEquipment"("equipmentId");

-- AddForeignKey
ALTER TABLE "InventoryItemEquipment" ADD CONSTRAINT "InventoryItemEquipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemEquipment" ADD CONSTRAINT "InventoryItemEquipment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemEquipment" ADD CONSTRAINT "InventoryItemEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_quickStep_positive" CHECK ("quickStep" > 0);
