-- AlterEnum
ALTER TYPE "ModuleKey" ADD VALUE 'CODING';

-- CreateTable
CREATE TABLE "CodingLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "minutesSpent" INTEGER,
    "topic" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodingLog_userId_date_key" ON "CodingLog"("userId", "date");

-- CreateIndex
CREATE INDEX "CodingLog_userId_idx" ON "CodingLog"("userId");

-- AddForeignKey
ALTER TABLE "CodingLog" ADD CONSTRAINT "CodingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
