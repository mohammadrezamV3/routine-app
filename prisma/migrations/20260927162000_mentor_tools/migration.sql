-- ابزارهای منتور: قالبِ برنامه، پاسخِ آماده، هشدارِ پایبندی
-- هر بخش مستقل است؛ برای حذفِ یک گزینه، جدول/ستونِ همان بخش را بردار.

-- AlterTable (هشدارِ پایبندی)
ALTER TABLE "MentorProfile" ADD COLUMN     "alertMissedDays" INTEGER;

-- CreateTable (قالبِ برنامه)
CREATE TABLE "MentorProgramTemplate" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MentorProgramType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "note" TEXT,
    "durationDays" INTEGER,
    "items" JSONB NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProgramTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable (پاسخِ آماده)
CREATE TABLE "MentorSavedReply" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorSavedReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable (هشدارِ پایبندی)
CREATE TABLE "MentorAdherenceAlert" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "missedDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorAdherenceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentorProgramTemplate_profileId_updatedAt_idx" ON "MentorProgramTemplate"("profileId", "updatedAt");

-- CreateIndex
CREATE INDEX "MentorSavedReply_profileId_createdAt_idx" ON "MentorSavedReply"("profileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MentorAdherenceAlert_mentorshipId_day_key" ON "MentorAdherenceAlert"("mentorshipId", "day");

-- AddForeignKey
ALTER TABLE "MentorProgramTemplate" ADD CONSTRAINT "MentorProgramTemplate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorSavedReply" ADD CONSTRAINT "MentorSavedReply_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAdherenceAlert" ADD CONSTRAINT "MentorAdherenceAlert_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
