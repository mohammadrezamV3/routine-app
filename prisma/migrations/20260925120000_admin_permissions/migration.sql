-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
