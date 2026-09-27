-- پیشرفتِ خودکارِ برنامه‌ی منتور: لاگ‌ها از تیک‌های روتینِ شاگرد مشتق می‌شوند.
-- همه‌ی تغییرها افزایشی‌اند؛ لاگ‌های دستیِ قبلی با source = 'MANUAL' می‌مانند.

-- AlterTable
ALTER TABLE "MentorProgram" ADD COLUMN "progressSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MentorProgramLog" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "doneOn" DATE;

-- CreateTable
CREATE TABLE "MentorProgramDayNote" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProgramDayNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MentorProgramDayNote_programId_date_key" ON "MentorProgramDayNote"("programId", "date");

-- AddForeignKey
ALTER TABLE "MentorProgramDayNote" ADD CONSTRAINT "MentorProgramDayNote_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
