-- اتصالِ متاتریدر — روی خودِ حساب (نه کاربر)، چون هر حساب ترمینال و
-- لاگینِ خودش را دارد. کدِ اتصال و توکنِ EA فقط به‌صورت SHA-256 ذخیره
-- می‌شوند. کلیدِ یکتای (accountId, externalId) روی معامله جلوی ثبتِ
-- تکراری در اجرای دوباره‌ی sync را می‌گیرد.
-- CreateEnum
CREATE TYPE "MtPlatform" AS ENUM ('MT4', 'MT5');

-- AlterTable
ALTER TABLE "TradeEntry" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- CreateTable
CREATE TABLE "TradeMtLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" "MtPlatform" NOT NULL,
    "pairingHash" TEXT,
    "pairingExpiresAt" TIMESTAMP(3),
    "tokenHash" TEXT,
    "tokenPrefix" TEXT,
    "brokerName" TEXT,
    "serverName" TEXT,
    "accountLogin" TEXT,
    "balance" DOUBLE PRECISION,
    "equity" DOUBLE PRECISION,
    "currency" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeMtLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeMtLink_accountId_key" ON "TradeMtLink"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeMtLink_pairingHash_key" ON "TradeMtLink"("pairingHash");

-- CreateIndex
CREATE UNIQUE INDEX "TradeMtLink_tokenHash_key" ON "TradeMtLink"("tokenHash");

-- CreateIndex
CREATE INDEX "TradeMtLink_userId_idx" ON "TradeMtLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeEntry_accountId_externalId_key" ON "TradeEntry"("accountId", "externalId");

-- AddForeignKey
ALTER TABLE "TradeMtLink" ADD CONSTRAINT "TradeMtLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeMtLink" ADD CONSTRAINT "TradeMtLink_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

