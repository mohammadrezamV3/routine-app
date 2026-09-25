-- همگام‌سازیِ آفلاین‌محورِ اپ اندروید (فاز ۱: روتین/داشبورد) + نشستِ موبایل روی جدولِ Session
-- AlterTable
ALTER TABLE "DailyEntry" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "deviceName" TEXT;

-- AlterTable
ALTER TABLE "SleepEntry" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserSetting" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DailyEntry_userId_updatedAt_idx" ON "DailyEntry"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SleepEntry_userId_updatedAt_idx" ON "SleepEntry"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Task_userId_updatedAt_idx" ON "Task"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "UserSetting_userId_updatedAt_idx" ON "UserSetting"("userId", "updatedAt");

