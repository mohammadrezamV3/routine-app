-- CreateTable
CREATE TABLE "WeeklyLetter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "issueNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "data" JSONB NOT NULL,
    "summary" JSONB,
    "readAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyLetter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyLetter_userId_createdAt_idx" ON "WeeklyLetter"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyLetter_userId_weekStart_key" ON "WeeklyLetter"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyLetter" ADD CONSTRAINT "WeeklyLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
