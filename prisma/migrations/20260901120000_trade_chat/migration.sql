-- CreateEnum
CREATE TYPE "TradeChatReportReason" AS ENUM ('SPAM', 'ABUSE', 'SCAM', 'OFFTOPIC', 'OTHER');

-- CreateEnum
CREATE TYPE "TradeChatReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateTable
CREATE TABLE "TradeChatMessage" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeChatReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "TradeChatReportReason" NOT NULL,
    "note" TEXT,
    "status" "TradeChatReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeChatReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeChatMessage_symbol_createdAt_idx" ON "TradeChatMessage"("symbol", "createdAt");

-- CreateIndex
CREATE INDEX "TradeChatMessage_userId_idx" ON "TradeChatMessage"("userId");

-- CreateIndex
CREATE INDEX "TradeChatReport_status_createdAt_idx" ON "TradeChatReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradeChatReport_messageId_reporterId_key" ON "TradeChatReport"("messageId", "reporterId");

-- AddForeignKey
ALTER TABLE "TradeChatMessage" ADD CONSTRAINT "TradeChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeChatReport" ADD CONSTRAINT "TradeChatReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TradeChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeChatReport" ADD CONSTRAINT "TradeChatReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

