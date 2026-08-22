-- AlterTable
ALTER TABLE "AiUsageRecord" ALTER COLUMN "model" TYPE TEXT USING "model"::TEXT;
ALTER TABLE "AiUsageRecord" ADD COLUMN "success" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AiUsageRecord" ADD COLUMN "durationMs" INTEGER;

-- CreateIndex
CREATE INDEX "AiUsageRecord_feature_createdAt_idx" ON "AiUsageRecord"("feature", "createdAt");
