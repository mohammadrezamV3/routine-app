-- AlterTable
ALTER TABLE "NotepadBlock" ADD COLUMN     "language" TEXT;

-- AlterTable
ALTER TABLE "NotepadPage" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

