-- منتورهای ذخیره‌شده (نشانک) — lib/savedMentors.ts، سقفِ ۱۰ سمتِ سرور
-- CreateTable
CREATE TABLE "SavedMentor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mentorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedMentor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedMentor_userId_mentorUserId_key" ON "SavedMentor"("userId", "mentorUserId");

-- CreateIndex
CREATE INDEX "SavedMentor_userId_createdAt_idx" ON "SavedMentor"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedMentor_mentorUserId_idx" ON "SavedMentor"("mentorUserId");

-- AddForeignKey
ALTER TABLE "SavedMentor" ADD CONSTRAINT "SavedMentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMentor" ADD CONSTRAINT "SavedMentor_mentorUserId_fkey" FOREIGN KEY ("mentorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
