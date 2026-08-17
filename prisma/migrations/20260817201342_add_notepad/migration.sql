-- CreateTable
CREATE TABLE "NotepadPage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "icon" TEXT,
    "coverUrl" TEXT,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotepadPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotepadBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "parentBlockId" TEXT,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '[]',
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotepadBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotepadPage_userId_idx" ON "NotepadPage"("userId");

-- CreateIndex
CREATE INDEX "NotepadPage_userId_parentId_idx" ON "NotepadPage"("userId", "parentId");

-- CreateIndex
CREATE INDEX "NotepadPage_userId_isFavorite_idx" ON "NotepadPage"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "NotepadPage_userId_isArchived_idx" ON "NotepadPage"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "NotepadPage_userId_lastOpenedAt_idx" ON "NotepadPage"("userId", "lastOpenedAt");

-- CreateIndex
CREATE INDEX "NotepadBlock_pageId_idx" ON "NotepadBlock"("pageId");

-- CreateIndex
CREATE INDEX "NotepadBlock_pageId_parentBlockId_idx" ON "NotepadBlock"("pageId", "parentBlockId");

-- AddForeignKey
ALTER TABLE "NotepadPage" ADD CONSTRAINT "NotepadPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotepadPage" ADD CONSTRAINT "NotepadPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NotepadPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotepadBlock" ADD CONSTRAINT "NotepadBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "NotepadPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotepadBlock" ADD CONSTRAINT "NotepadBlock_parentBlockId_fkey" FOREIGN KEY ("parentBlockId") REFERENCES "NotepadBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

