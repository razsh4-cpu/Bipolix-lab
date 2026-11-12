-- CreateEnum
CREATE TYPE "EquipmentProcurement" AS ENUM ('IN_SERVICE', 'ON_ORDER', 'TO_ORDER');

-- "In use" and "limited operation" are retired: such machines become operational.
-- Open fault reports still flag them on the dashboard.
UPDATE "Equipment" SET "status" = 'OPERATIONAL' WHERE "status" IN ('IN_USE', 'LIMITED_OPERATION');

-- AlterEnum
BEGIN;
CREATE TYPE "EquipmentStatus_new" AS ENUM ('OPERATIONAL', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE');
ALTER TABLE "public"."Equipment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Equipment" ALTER COLUMN "status" TYPE "EquipmentStatus_new" USING ("status"::text::"EquipmentStatus_new");
ALTER TYPE "EquipmentStatus" RENAME TO "EquipmentStatus_old";
ALTER TYPE "EquipmentStatus_new" RENAME TO "EquipmentStatus";
DROP TYPE "public"."EquipmentStatus_old";
ALTER TABLE "Equipment" ALTER COLUMN "status" SET DEFAULT 'OPERATIONAL';
COMMIT;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "procurement" "EquipmentProcurement" NOT NULL DEFAULT 'IN_SERVICE';

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Equipment_organizationId_procurement_idx" ON "Equipment"("organizationId", "procurement");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

