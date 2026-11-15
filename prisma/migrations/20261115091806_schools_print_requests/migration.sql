-- CreateEnum
CREATE TYPE "PrintRequestStatus" AS ENUM ('PENDING', 'PRINTING', 'PRINTED', 'DELIVERED');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER,
    "filesUrl" TEXT,
    "status" "PrintRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_organizationId_name_key" ON "School"("organizationId", "name");

-- CreateIndex
CREATE INDEX "PrintRequest_organizationId_schoolId_status_idx" ON "PrintRequest"("organizationId", "schoolId", "status");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequest" ADD CONSTRAINT "PrintRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequest" ADD CONSTRAINT "PrintRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequest" ADD CONSTRAINT "PrintRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The two schools the truck prints for today (named by the admin). Only in the
-- truck's organization; a fresh database without it gets none.
INSERT INTO "School" ("id", "organizationId", "name", "updatedAt")
SELECT gen_random_uuid()::text, o."id", s."name", CURRENT_TIMESTAMP
FROM "Organization" o
CROSS JOIN (VALUES ('אולפנא עדי'), ('אולפנא נריה')) AS s("name")
WHERE o."slug" = 'mobile-lab'
ON CONFLICT ("organizationId", "name") DO NOTHING;
