-- «پاک کردن سابقه‌ی گفت‌وگو» فقط برای یک طرف + «گزارش گفت‌وگو» با پیام‌های تأییدشده

-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN "mentorClearedBefore" TIMESTAMP(3),
ADD COLUMN "studentClearedBefore" TIMESTAMP(3);

-- AlterEnum
ALTER TYPE "MentorReportTarget" ADD VALUE 'CONVERSATION';

-- CreateTable
CREATE TABLE "MentorReportMessage" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "messageAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "MentorReportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MentorReportMessage_reportId_messageId_key" ON "MentorReportMessage"("reportId", "messageId");

-- CreateIndex
CREATE INDEX "MentorReportMessage_reportId_position_idx" ON "MentorReportMessage"("reportId", "position");

-- AddForeignKey
ALTER TABLE "MentorReportMessage" ADD CONSTRAINT "MentorReportMessage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MentorReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
