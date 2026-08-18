-- CreateTable
CREATE TABLE "NotepadDatabase" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'دیتابیس',
    "activeView" TEXT NOT NULL DEFAULT 'table',
    "filters" JSONB NOT NULL DEFAULT '[]',
    "sorts" JSONB NOT NULL DEFAULT '[]',
    "hiddenPropertyIds" JSONB NOT NULL DEFAULT '[]',
    "boardGroupPropertyId" TEXT,
    "calendarDatePropertyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotepadDatabase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotepadDatabaseProperty" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotepadDatabaseProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotepadDatabaseRecord" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotepadDatabaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotepadDatabase_blockId_key" ON "NotepadDatabase"("blockId");

-- CreateIndex
CREATE INDEX "NotepadDatabase_blockId_idx" ON "NotepadDatabase"("blockId");

-- CreateIndex
CREATE INDEX "NotepadDatabaseProperty_databaseId_idx" ON "NotepadDatabaseProperty"("databaseId");

-- CreateIndex
CREATE INDEX "NotepadDatabaseRecord_databaseId_idx" ON "NotepadDatabaseRecord"("databaseId");

-- AddForeignKey
ALTER TABLE "NotepadDatabase" ADD CONSTRAINT "NotepadDatabase_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "NotepadBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotepadDatabaseProperty" ADD CONSTRAINT "NotepadDatabaseProperty_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "NotepadDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotepadDatabaseRecord" ADD CONSTRAINT "NotepadDatabaseRecord_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "NotepadDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

