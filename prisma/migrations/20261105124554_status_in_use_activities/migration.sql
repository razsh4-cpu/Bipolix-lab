-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PLANNED', 'DONE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "EquipmentStatus" ADD VALUE 'IN_USE';

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT NOT NULL,
    "audience" TEXT,
    "participants" INTEGER,
    "status" "ActivityStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_organizationId_date_idx" ON "Activity"("organizationId", "date");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_times_format"
  CHECK (("startTime" IS NULL OR "startTime" ~ '^[0-2][0-9]:[0-5][0-9]$') AND ("endTime" IS NULL OR "endTime" ~ '^[0-2][0-9]:[0-5][0-9]$'));
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_participants_nonneg" CHECK ("participants" IS NULL OR "participants" >= 0);
