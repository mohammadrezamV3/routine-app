-- همگام‌سازیِ موبایل برای ماژول‌های بدنسازی و کالری (فاز ۴).
-- updatedAt روی جدول‌های پُر اضافه می‌شه: اول با DEFAULT تا ردیف‌های موجود
-- مقدار بگیرن، بعد backfill به createdAt (زمانِ واقعیِ آخرین تغییرِ شناخته‌شده)،
-- و در آخر DEFAULT برداشته می‌شه تا با @updatedAtِ Prisma (بدونِ پیش‌فرضِ DB) یکی باشه.

-- AlterTable
ALTER TABLE "CalorieTarget" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "CalorieTarget" SET "updatedAt" = "createdAt";
ALTER TABLE "CalorieTarget" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ExerciseLog" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "ExerciseLog" SET "updatedAt" = "createdAt";
ALTER TABLE "ExerciseLog" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ExercisePlan" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FoodLogEntry" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "FoodLogEntry" SET "updatedAt" = "createdAt";
ALTER TABLE "FoodLogEntry" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "CalorieTarget_userId_updatedAt_idx" ON "CalorieTarget"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ExerciseLog_userId_updatedAt_idx" ON "ExerciseLog"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ExercisePlan_userId_updatedAt_idx" ON "ExercisePlan"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "FoodLogEntry_userId_updatedAt_idx" ON "FoodLogEntry"("userId", "updatedAt");
