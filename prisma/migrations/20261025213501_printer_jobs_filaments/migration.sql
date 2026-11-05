-- CreateEnum
CREATE TYPE "PrinterJobResult" AS ENUM ('FINISHED', 'FAILED');

-- AlterTable
ALTER TABLE "PrinterStatus" ADD COLUMN     "filaments" JSONB,
ADD COLUMN     "jobStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PrinterJob" (
    "id" TEXT NOT NULL,
    "printerLinkId" TEXT NOT NULL,
    "jobName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "result" "PrinterJobResult" NOT NULL,

    CONSTRAINT "PrinterJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrinterJob_printerLinkId_endedAt_idx" ON "PrinterJob"("printerLinkId", "endedAt");

-- AddForeignKey
ALTER TABLE "PrinterJob" ADD CONSTRAINT "PrinterJob_printerLinkId_fkey" FOREIGN KEY ("printerLinkId") REFERENCES "PrinterLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
