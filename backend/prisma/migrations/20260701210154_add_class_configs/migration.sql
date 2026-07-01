-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConstraintType" ADD VALUE 'LATE_START';
ALTER TYPE "ConstraintType" ADD VALUE 'EARLY_FINISH';
ALTER TYPE "ConstraintType" ADD VALUE 'BEFORE_BREAK_ONLY';
ALTER TYPE "ConstraintType" ADD VALUE 'AFTER_BREAK_ONLY';
ALTER TYPE "ConstraintType" ADD VALUE 'DAY_OFF';
ALTER TYPE "ConstraintType" ADD VALUE 'MAX_PER_DAY';
ALTER TYPE "ConstraintType" ADD VALUE 'MIN_REST';
ALTER TYPE "ConstraintType" ADD VALUE 'BALANCED_DAYS';
ALTER TYPE "ConstraintType" ADD VALUE 'MORNING_SUBJECT';
ALTER TYPE "ConstraintType" ADD VALUE 'AFTERNOON_SUBJECT';

-- AlterTable
ALTER TABLE "TimetableSlot" ADD COLUMN     "isDouble" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "class_schedule_configs" (
    "id" TEXT NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "configId" TEXT NOT NULL,
    "periodsPerDay" INTEGER NOT NULL DEFAULT 7,
    "sessionDuration" INTEGER NOT NULL DEFAULT 45,
    "breakAfterPeriods" TEXT NOT NULL DEFAULT '4',
    "breakDurations" TEXT NOT NULL DEFAULT '15',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_schedule_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_schedule_configs_sectionId_key" ON "class_schedule_configs"("sectionId");

-- AddForeignKey
ALTER TABLE "class_schedule_configs" ADD CONSTRAINT "class_schedule_configs_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedule_configs" ADD CONSTRAINT "class_schedule_configs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "TimetableConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
