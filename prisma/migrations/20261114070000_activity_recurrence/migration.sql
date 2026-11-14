-- CreateEnum
CREATE TYPE "ActivityRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "recurrence" "ActivityRecurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "recurrenceUntil" DATE;

