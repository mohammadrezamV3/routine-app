-- AlterTable
ALTER TABLE "Friendship" ADD COLUMN     "favoritedByAddressee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "favoritedByRequester" BOOLEAN NOT NULL DEFAULT false;
