-- AlterTable
ALTER TABLE "WeeklyReportSnapshot" ADD COLUMN     "patterns" JSONB,
ADD COLUMN     "aiInsights" JSONB,
ADD COLUMN     "prediction" JSONB;

-- CreateTable
CREATE TABLE "WeeklyGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "domain" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "wasEdited" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "followUpWeekStart" DATE NOT NULL,
    "followUpScoreBefore" INTEGER,
    "followUpScoreAfter" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "WeeklyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyGoal_userId_weekStart_idx" ON "WeeklyGoal"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyGoal_userId_followUpWeekStart_idx" ON "WeeklyGoal"("userId", "followUpWeekStart");

-- AddForeignKey
ALTER TABLE "WeeklyGoal" ADD CONSTRAINT "WeeklyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
