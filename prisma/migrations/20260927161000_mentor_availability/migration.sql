-- دسترس‌پذیری و مدیریتِ شاگرد در پنلِ منتور (ظرفیت، عدمِ حضور، سؤال‌های پذیرش،
-- پیامِ خوش‌آمد، زمانِ پاسخ، توقف/پایان با دلیل، برچسب و یادداشتِ خصوصی)

-- AlterTable
ALTER TABLE "MentorProfile" ADD COLUMN     "maxActiveStudents" INTEGER,
ADD COLUMN     "awayUntil" DATE,
ADD COLUMN     "awayMessage" TEXT,
ADD COLUMN     "awayPausesRequests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "responseTimeHours" INTEGER,
ADD COLUMN     "welcomeMessage" TEXT,
ADD COLUMN     "intakeQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pauseReason" TEXT,
ADD COLUMN     "endReason" TEXT,
ADD COLUMN     "endedBy" TEXT,
ADD COLUMN     "mentorLabelIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "MentorStudentLabel" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorStudentLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorStudentNote" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorStudentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorIntakeAnswer" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorIntakeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MentorIntakeAnswer_mentorshipId_order_key" ON "MentorIntakeAnswer"("mentorshipId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MentorStudentLabel_profileId_name_key" ON "MentorStudentLabel"("profileId", "name");

-- CreateIndex
CREATE INDEX "MentorStudentNote_mentorshipId_createdAt_idx" ON "MentorStudentNote"("mentorshipId", "createdAt");

-- AddForeignKey
ALTER TABLE "MentorStudentLabel" ADD CONSTRAINT "MentorStudentLabel_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorStudentNote" ADD CONSTRAINT "MentorStudentNote_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorIntakeAnswer" ADD CONSTRAINT "MentorIntakeAnswer_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
