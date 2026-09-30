-- اچیومنت‌های دائمیِ «روتین من» (lib/achievements.ts) + نامِ طلایی + یادداشتِ خواب

ALTER TABLE "User" ADD COLUMN "goldenSince" TIMESTAMP(3);

CREATE TABLE "UserAchievement" (
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","achievementId")
);

CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SleepEntry" ADD COLUMN "note" TEXT;
