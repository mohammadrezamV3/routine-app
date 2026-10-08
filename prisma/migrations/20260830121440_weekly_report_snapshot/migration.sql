-- CreateTable
CREATE TABLE "WeeklyReportSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "algorithmVersion" INTEGER NOT NULL DEFAULT 1,
    "overallScore" INTEGER,
    "domainScores" JSONB NOT NULL,
    "dailyBreakdown" JSONB NOT NULL,
    "wins" JSONB NOT NULL,
    "problems" JSONB NOT NULL,
    "comparison" JSONB NOT NULL,
    "aiModel" TEXT,
    "aiSummary" TEXT,
    "aiRecommendations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyReportSnapshot_userId_weekStart_idx" ON "WeeklyReportSnapshot"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReportSnapshot_userId_weekStart_algorithmVersion_key" ON "WeeklyReportSnapshot"("userId", "weekStart", "algorithmVersion");

-- AddForeignKey
ALTER TABLE "WeeklyReportSnapshot" ADD CONSTRAINT "WeeklyReportSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
