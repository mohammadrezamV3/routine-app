-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('REFERRAL_REWARD', 'CHECKOUT_REDEMPTION', 'ADMIN_ADJUSTMENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "walletBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ReferralUsage" ADD COLUMN     "rewardAmount" INTEGER;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "walletAmountApplied" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referralUsageId" TEXT,
    "paymentId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingCheckout" (
    "id" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletApplied" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckout_authority_key" ON "PendingCheckout"("authority");

-- CreateIndex
CREATE INDEX "PendingCheckout_userId_idx" ON "PendingCheckout"("userId");

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
