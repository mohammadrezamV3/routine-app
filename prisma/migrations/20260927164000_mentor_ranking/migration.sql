-- رتبه‌بندیِ شایستگیِ منتورها (lib/mentorRankingStats.ts، docs/mentor-ranking.md)
-- جدول کاملاً مشتق‌شده است: حذفش فقط رتبه‌بندی را برمی‌دارد و از داده‌ی خام بازسازی می‌شود.

-- CreateTable
CREATE TABLE "MentorRankingStat" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eligible" BOOLEAN NOT NULL DEFAULT false,
    "sampleStudents" INTEGER NOT NULL DEFAULT 0,
    "verifiedReviews" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorRankingStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MentorRankingStat_profileId_category_key" ON "MentorRankingStat"("profileId", "category");

-- CreateIndex
CREATE INDEX "MentorRankingStat_category_score_idx" ON "MentorRankingStat"("category", "score" DESC);

-- CreateIndex
CREATE INDEX "MentorRankingStat_category_ratingScore_idx" ON "MentorRankingStat"("category", "ratingScore" DESC);

-- CreateIndex
CREATE INDEX "MentorRankingStat_computedAt_idx" ON "MentorRankingStat"("computedAt");

-- AddForeignKey
ALTER TABLE "MentorRankingStat" ADD CONSTRAINT "MentorRankingStat_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
