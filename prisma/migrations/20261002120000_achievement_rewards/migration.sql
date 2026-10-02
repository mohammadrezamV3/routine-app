-- پاداش تخفیف اچیومنت‌ها (20٪ با نصف، 50٪ با همه) — یک بار مصرف، فقط یک‌ماهه

CREATE TABLE "AchievementReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "subscriptionId" TEXT,

    CONSTRAINT "AchievementReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AchievementReward_userId_tier_key" ON "AchievementReward"("userId", "tier");

CREATE INDEX "AchievementReward_userId_idx" ON "AchievementReward"("userId");

ALTER TABLE "AchievementReward" ADD CONSTRAINT "AchievementReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
