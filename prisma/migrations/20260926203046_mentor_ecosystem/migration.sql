-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_PROVIDED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MentorDocumentKind" AS ENUM ('IDENTITY', 'CERTIFICATE');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED', 'ENDED');

-- CreateEnum
CREATE TYPE "MentorProgramStatus" AS ENUM ('DRAFT', 'PENDING', 'ACCEPTED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MentorProgramType" AS ENUM ('ROUTINE', 'WORKOUT');

-- CreateEnum
CREATE TYPE "ProgramLogStatus" AS ENUM ('COMPLETED', 'PARTIAL', 'MISSED');

-- CreateEnum
CREATE TYPE "MentorReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "MentorReportTarget" AS ENUM ('USER', 'REVIEW', 'MESSAGE', 'PROGRAM');

-- CreateEnum
CREATE TYPE "MentorReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "MentorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "acceptingStudents" BOOLEAN NOT NULL DEFAULT true,
    "identityStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_PROVIDED',
    "identityRejectReason" TEXT,
    "identityReviewedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorCredential" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'NOT_PROVIDED',
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorDocument" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" "MentorDocumentKind" NOT NULL,
    "category" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorVerificationEvent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" "MentorDocumentKind" NOT NULL,
    "category" TEXT,
    "fromStatus" "VerificationStatus" NOT NULL,
    "toStatus" "VerificationStatus" NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorVerificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentorship" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedBy" TEXT NOT NULL,
    "message" TEXT,
    "blockedById" TEXT,
    "shareAllPrograms" BOOLEAN NOT NULL DEFAULT false,
    "sharedPrograms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "showSchedule" BOOLEAN NOT NULL DEFAULT true,
    "showProgramName" BOOLEAN NOT NULL DEFAULT true,
    "showTaskName" BOOLEAN NOT NULL DEFAULT false,
    "showTaskDetails" BOOLEAN NOT NULL DEFAULT false,
    "showProgress" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mentorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorProgram" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "MentorProgramType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "status" "MentorProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "changeRequestNote" TEXT,
    "rejectReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorProgramItem" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "repeat" TEXT NOT NULL DEFAULT 'WEEKLY',
    "days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "startTime" TEXT,
    "durationMin" INTEGER,
    "sets" INTEGER,
    "reps" TEXT,
    "weightKg" DOUBLE PRECISION,
    "restSec" INTEGER,

    CONSTRAINT "MentorProgramItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorProgramLog" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "ProgramLogStatus" NOT NULL,
    "setsDone" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProgramLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorFeedback" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "itemId" TEXT,
    "logId" TEXT,
    "mentorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorMessage" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorReview" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "status" "MentorReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "hiddenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "MentorReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "MentorReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MentorProfile_userId_key" ON "MentorProfile"("userId");

-- CreateIndex
CREATE INDEX "MentorProfile_published_suspendedAt_idx" ON "MentorProfile"("published", "suspendedAt");

-- CreateIndex
CREATE INDEX "MentorCredential_status_idx" ON "MentorCredential"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MentorCredential_profileId_category_key" ON "MentorCredential"("profileId", "category");

-- CreateIndex
CREATE INDEX "MentorDocument_profileId_kind_idx" ON "MentorDocument"("profileId", "kind");

-- CreateIndex
CREATE INDEX "MentorVerificationEvent_profileId_createdAt_idx" ON "MentorVerificationEvent"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "Mentorship_studentId_status_idx" ON "Mentorship"("studentId", "status");

-- CreateIndex
CREATE INDEX "Mentorship_mentorId_status_idx" ON "Mentorship"("mentorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Mentorship_mentorId_studentId_key" ON "Mentorship"("mentorId", "studentId");

-- CreateIndex
CREATE INDEX "MentorProgram_studentId_status_idx" ON "MentorProgram"("studentId", "status");

-- CreateIndex
CREATE INDEX "MentorProgram_mentorId_status_idx" ON "MentorProgram"("mentorId", "status");

-- CreateIndex
CREATE INDEX "MentorProgram_mentorshipId_idx" ON "MentorProgram"("mentorshipId");

-- CreateIndex
CREATE INDEX "MentorProgramItem_programId_order_idx" ON "MentorProgramItem"("programId", "order");

-- CreateIndex
CREATE INDEX "MentorProgramLog_programId_date_idx" ON "MentorProgramLog"("programId", "date");

-- CreateIndex
CREATE INDEX "MentorProgramLog_studentId_date_idx" ON "MentorProgramLog"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MentorProgramLog_itemId_date_key" ON "MentorProgramLog"("itemId", "date");

-- CreateIndex
CREATE INDEX "MentorFeedback_programId_createdAt_idx" ON "MentorFeedback"("programId", "createdAt");

-- CreateIndex
CREATE INDEX "MentorFeedback_studentId_readAt_idx" ON "MentorFeedback"("studentId", "readAt");

-- CreateIndex
CREATE INDEX "MentorMessage_mentorshipId_createdAt_idx" ON "MentorMessage"("mentorshipId", "createdAt");

-- CreateIndex
CREATE INDEX "MentorMessage_mentorshipId_senderId_readAt_idx" ON "MentorMessage"("mentorshipId", "senderId", "readAt");

-- CreateIndex
CREATE INDEX "MentorReview_mentorId_status_createdAt_idx" ON "MentorReview"("mentorId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MentorReview_mentorId_studentId_key" ON "MentorReview"("mentorId", "studentId");

-- CreateIndex
CREATE INDEX "MentorReport_status_createdAt_idx" ON "MentorReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MentorReport_reporterId_targetType_targetId_key" ON "MentorReport"("reporterId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_createdAt_idx" ON "InAppNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_readAt_idx" ON "InAppNotification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorCredential" ADD CONSTRAINT "MentorCredential_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorDocument" ADD CONSTRAINT "MentorDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorVerificationEvent" ADD CONSTRAINT "MentorVerificationEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorProgram" ADD CONSTRAINT "MentorProgram_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorProgram" ADD CONSTRAINT "MentorProgram_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorProgram" ADD CONSTRAINT "MentorProgram_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorProgramItem" ADD CONSTRAINT "MentorProgramItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorProgramLog" ADD CONSTRAINT "MentorProgramLog_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorProgramLog" ADD CONSTRAINT "MentorProgramLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MentorProgramItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorFeedback" ADD CONSTRAINT "MentorFeedback_programId_fkey" FOREIGN KEY ("programId") REFERENCES "MentorProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorFeedback" ADD CONSTRAINT "MentorFeedback_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MentorProgramItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorFeedback" ADD CONSTRAINT "MentorFeedback_logId_fkey" FOREIGN KEY ("logId") REFERENCES "MentorProgramLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorReview" ADD CONSTRAINT "MentorReview_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorReview" ADD CONSTRAINT "MentorReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorReview" ADD CONSTRAINT "MentorReview_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorReport" ADD CONSTRAINT "MentorReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
