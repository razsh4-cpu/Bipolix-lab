-- CreateEnum
CREATE TYPE "ProcedureKind" AS ENUM ('SAFETY', 'OPERATION', 'MAINTENANCE', 'GENERAL');

-- AlterTable
ALTER TABLE "FaultReport" ADD COLUMN     "expectedFixAt" DATE,
ADD COLUMN     "handledBy" TEXT;

-- CreateTable
CREATE TABLE "FaultUpdate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "faultReportId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "fromStatus" "FaultStatus",
    "toStatus" "FaultStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaultUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "kind" "ProcedureKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureRevision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedureRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaultUpdate_faultReportId_createdAt_idx" ON "FaultUpdate"("faultReportId", "createdAt");

-- CreateIndex
CREATE INDEX "Procedure_organizationId_equipmentId_idx" ON "Procedure"("organizationId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureRevision_procedureId_version_key" ON "ProcedureRevision"("procedureId", "version");

-- AddForeignKey
ALTER TABLE "FaultUpdate" ADD CONSTRAINT "FaultUpdate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultUpdate" ADD CONSTRAINT "FaultUpdate_faultReportId_fkey" FOREIGN KEY ("faultReportId") REFERENCES "FaultReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultUpdate" ADD CONSTRAINT "FaultUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureRevision" ADD CONSTRAINT "ProcedureRevision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureRevision" ADD CONSTRAINT "ProcedureRevision_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureRevision" ADD CONSTRAINT "ProcedureRevision_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- History tables are append-only.
CREATE TRIGGER "FaultUpdate_append_only" BEFORE UPDATE OR DELETE ON "FaultUpdate"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER "ProcedureRevision_append_only" BEFORE UPDATE OR DELETE ON "ProcedureRevision"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_version_positive" CHECK ("version" >= 1);
