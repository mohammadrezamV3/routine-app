-- AlterTable
ALTER TABLE "User" ADD COLUMN     "chatBanUntil" TIMESTAMP(3),
ADD COLUMN     "chatDisabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "chatWarnAt" TIMESTAMP(3),
ADD COLUMN     "chatWarnNote" TEXT,
ADD COLUMN     "chatWarnSeenAt" TIMESTAMP(3);
