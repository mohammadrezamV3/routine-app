-- نشستِ موبایل: هشِ refresh tokenِ قبلی برای تشخیصِ استفاده‌ی مجدد (reuse detection)
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "previousTokenHash" TEXT;

-- CreateIndex
CREATE INDEX "Session_previousTokenHash_idx" ON "Session"("previousTokenHash");

