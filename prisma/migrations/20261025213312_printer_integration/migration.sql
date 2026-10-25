-- CreateEnum
CREATE TYPE "PrinterVendor" AS ENUM ('BAMBU_LAB');

-- CreateTable
CREATE TABLE "PrinterLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "vendor" "PrinterVendor" NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrinterLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterStatus" (
    "printerLinkId" TEXT NOT NULL,
    "online" BOOLEAN NOT NULL,
    "state" TEXT,
    "jobName" TEXT,
    "progressPercent" INTEGER,
    "remainingMinutes" INTEGER,
    "layer" INTEGER,
    "totalLayers" INTEGER,
    "nozzleTemps" JSONB,
    "bedTemp" DOUBLE PRECISION,
    "chamberTemp" DOUBLE PRECISION,
    "hmsAlerts" JSONB,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrinterStatus_pkey" PRIMARY KEY ("printerLinkId")
);

-- CreateTable
CREATE TABLE "BridgeToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BridgeToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrinterLink_equipmentId_key" ON "PrinterLink"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterLink_organizationId_serialNumber_key" ON "PrinterLink"("organizationId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BridgeToken_tokenHash_key" ON "BridgeToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "PrinterLink" ADD CONSTRAINT "PrinterLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterLink" ADD CONSTRAINT "PrinterLink_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterStatus" ADD CONSTRAINT "PrinterStatus_printerLinkId_fkey" FOREIGN KEY ("printerLinkId") REFERENCES "PrinterLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BridgeToken" ADD CONSTRAINT "BridgeToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BridgeToken" ADD CONSTRAINT "BridgeToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
