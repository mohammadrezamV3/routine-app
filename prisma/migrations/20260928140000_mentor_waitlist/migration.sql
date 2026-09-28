-- صفِ انتظار برای منتورِ پُر (lib/mentorWaitlistServer.ts، docs/mentors.md → «صف انتظار»).
-- waitlistSeq فقط شمارنده‌ی قفلِ ردیفیِ پیش‌بردنِ صف است؛ backfill لازم ندارد.

-- CreateEnum
CREATE TYPE "MentorWaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "MentorProfile" ADD COLUMN     "waitlistSeq" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MentorWaitlistEntry" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MentorWaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offeredAt" TIMESTAMP(3),
    "offerExpiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "mentorshipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorWaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentorWaitlistEntry_mentorId_status_joinedAt_idx" ON "MentorWaitlistEntry"("mentorId", "status", "joinedAt");

-- CreateIndex
CREATE INDEX "MentorWaitlistEntry_status_offerExpiresAt_idx" ON "MentorWaitlistEntry"("status", "offerExpiresAt");

-- CreateIndex
CREATE INDEX "MentorWaitlistEntry_userId_status_idx" ON "MentorWaitlistEntry"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MentorWaitlistEntry_mentorId_userId_key" ON "MentorWaitlistEntry"("mentorId", "userId");

-- AddForeignKey
ALTER TABLE "MentorWaitlistEntry" ADD CONSTRAINT "MentorWaitlistEntry_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorWaitlistEntry" ADD CONSTRAINT "MentorWaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorWaitlistEntry" ADD CONSTRAINT "MentorWaitlistEntry_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE SET NULL ON UPDATE CASCADE;

