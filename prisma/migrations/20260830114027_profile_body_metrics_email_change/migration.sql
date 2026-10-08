-- AlterTable
ALTER TABLE "User" ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "weightKg" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "EmailChangeOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailChangeOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailChangeOtp_userId_idx" ON "EmailChangeOtp"("userId");
