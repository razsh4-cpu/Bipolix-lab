-- CreateEnum
CREATE TYPE "DevelopmentStatus" AS ENUM ('IDEA', 'IN_PROGRESS', 'TESTING', 'DONE', 'ON_HOLD');

-- CreateTable
CREATE TABLE "Development" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "DevelopmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "owner" TEXT,
    "targetDate" DATE,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Development_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Development_organizationId_status_idx" ON "Development"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

