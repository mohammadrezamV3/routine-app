-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
