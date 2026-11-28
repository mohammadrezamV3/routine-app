-- چند جلسه‌ی تمرین در یک روز؛ ردیف‌های موجود می‌شن جلسه‌ی 1
ALTER TABLE "ExerciseLog" ADD COLUMN "sessionNo" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ExerciseLog" ADD COLUMN "plannedCount" INTEGER;

DROP INDEX "ExerciseLog_userId_planId_date_key";
CREATE UNIQUE INDEX "ExerciseLog_userId_planId_date_sessionNo_key" ON "ExerciseLog"("userId", "planId", "date", "sessionNo");
