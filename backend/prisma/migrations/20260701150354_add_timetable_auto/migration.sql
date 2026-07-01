-- CreateEnum
CREATE TYPE "ConstraintType" AS ENUM ('UNAVAILABLE', 'PREFER_MORNING', 'PREFER_AFTERNOON', 'NO_LAST_PERIOD', 'NO_FIRST_PERIOD', 'MAX_CONSECUTIVE', 'PREFERRED_DAY');

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "maxHoursPerWeek" INTEGER;

-- CreateTable
CREATE TABLE "TimetableConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYearId" TEXT,
    "daysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "periodsPerDay" INTEGER NOT NULL DEFAULT 7,
    "periodDuration" INTEGER NOT NULL DEFAULT 45,
    "startTime" TEXT NOT NULL DEFAULT '07:30',
    "breakAfterPeriod" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableSlot" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_constraints" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "type" "ConstraintType" NOT NULL,
    "day" INTEGER,
    "period" INTEGER,
    "value" TEXT,
    "note" TEXT,

    CONSTRAINT "teacher_constraints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_configId_sectionId_day_period_key" ON "TimetableSlot"("configId", "sectionId", "day", "period");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_configId_teacherId_day_period_key" ON "TimetableSlot"("configId", "teacherId", "day", "period");

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_configId_fkey" FOREIGN KEY ("configId") REFERENCES "TimetableConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_constraints" ADD CONSTRAINT "teacher_constraints_configId_fkey" FOREIGN KEY ("configId") REFERENCES "TimetableConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_constraints" ADD CONSTRAINT "teacher_constraints_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
