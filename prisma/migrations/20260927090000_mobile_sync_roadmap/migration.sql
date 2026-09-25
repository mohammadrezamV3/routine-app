-- همگام‌سازیِ پیشرفتِ رودمپ از اپ موبایل (LWW)
-- AlterTable
ALTER TABLE "Roadmap" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Roadmap_userId_updatedAt_idx" ON "Roadmap"("userId", "updatedAt");

