-- AlterEnum
ALTER TYPE "AiFeatureKey" ADD VALUE 'COACH_NOMO';

-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "shareSleep" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MentorGoal" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "weeks" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorWeekSnapshot" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "summary" TEXT,
    "seenAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorWeekSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentorGoal_mentorshipId_status_idx" ON "MentorGoal"("mentorshipId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MentorWeekSnapshot_mentorshipId_weekStart_key" ON "MentorWeekSnapshot"("mentorshipId", "weekStart");

-- AddForeignKey
ALTER TABLE "MentorGoal" ADD CONSTRAINT "MentorGoal_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorWeekSnapshot" ADD CONSTRAINT "MentorWeekSnapshot_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

