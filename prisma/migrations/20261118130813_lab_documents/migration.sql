-- CreateEnum
CREATE TYPE "LabDocumentCategory" AS ENUM ('AUTHORITIES', 'EQUIPMENT', 'GENERAL');

-- CreateTable
CREATE TABLE "LabDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "LabDocumentCategory" NOT NULL DEFAULT 'GENERAL',
    "documentDate" DATE,
    "notes" TEXT,
    "fileName" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabDocument_blobPathname_key" ON "LabDocument"("blobPathname");

-- CreateIndex
CREATE INDEX "LabDocument_organizationId_category_idx" ON "LabDocument"("organizationId", "category");

-- AddForeignKey
ALTER TABLE "LabDocument" ADD CONSTRAINT "LabDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabDocument" ADD CONSTRAINT "LabDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
