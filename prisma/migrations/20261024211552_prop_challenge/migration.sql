-- CreateEnum
CREATE TYPE "TradePropStatus" AS ENUM ('ACTIVE', 'PASSED', 'FAILED', 'FUNDED');

-- CreateTable
CREATE TABLE "TradePropChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "currentPhase" INTEGER NOT NULL DEFAULT 0,
    "status" "TradePropStatus" NOT NULL DEFAULT 'ACTIVE',
    "phaseStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phaseEndedAt" TIMESTAMP(3),
    "phaseStartBalance" DOUBLE PRECISION,
    "history" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradePropChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradePropChallenge_accountId_key" ON "TradePropChallenge"("accountId");

-- CreateIndex
CREATE INDEX "TradePropChallenge_userId_idx" ON "TradePropChallenge"("userId");

-- AddForeignKey
ALTER TABLE "TradePropChallenge" ADD CONSTRAINT "TradePropChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradePropChallenge" ADD CONSTRAINT "TradePropChallenge_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
