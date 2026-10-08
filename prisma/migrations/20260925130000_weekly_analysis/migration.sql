-- «آنالیز هفتگی» جایگزینِ «گزارش هفتگی» می‌شه: WeeklyReportSnapshot و
-- WeeklyGoal حذف و سه مدلِ جدید (WeeklyAnalysisAi/WeeklyAnalysisGoal/
-- WeeklyReflection) جایگزین می‌شن. خودِ محاسبه‌ی آنالیز snapshot نمی‌شه —
-- فقط خروجیِ AI، اهداف، و ریفلکشن نیاز به جدول دارن.

-- DropForeignKey
ALTER TABLE "WeeklyReportSnapshot" DROP CONSTRAINT "WeeklyReportSnapshot_userId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyGoal" DROP CONSTRAINT "WeeklyGoal_userId_fkey";

-- DropTable
DROP TABLE "WeeklyReportSnapshot";

-- DropTable
DROP TABLE "WeeklyGoal";

-- CreateTable
CREATE TABLE "WeeklyAnalysisAi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyAnalysisAi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyAnalysisGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "domain" TEXT,
    "title" TEXT NOT NULL,
    "target" INTEGER,
    "status" TEXT NOT NULL,
    "achievedScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "WeeklyAnalysisGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "wentWell" TEXT NOT NULL,
    "improve" TEXT NOT NULL,
    "mood" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAnalysisAi_userId_weekStart_key" ON "WeeklyAnalysisAi"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyAnalysisGoal_userId_weekStart_idx" ON "WeeklyAnalysisGoal"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReflection_userId_weekStart_key" ON "WeeklyReflection"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyAnalysisAi" ADD CONSTRAINT "WeeklyAnalysisAi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAnalysisGoal" ADD CONSTRAINT "WeeklyAnalysisGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReflection" ADD CONSTRAINT "WeeklyReflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
