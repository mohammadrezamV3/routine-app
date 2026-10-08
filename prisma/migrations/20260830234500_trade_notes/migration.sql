-- یادداشت‌های ترید — مدلِ سبکِ مستقل (نه NotepadPage/Block)، با برچسبِ
-- مشترکِ ماژولِ ترید و اتصالِ اختیاری به حساب/معامله.
-- CreateTable
CREATE TABLE "TradeNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#3E7BFA',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT,
    "entryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TradeNoteTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "TradeNote_userId_updatedAt_idx" ON "TradeNote"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "TradeNote_accountId_idx" ON "TradeNote"("accountId");

-- CreateIndex
CREATE INDEX "TradeNote_entryId_idx" ON "TradeNote"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "_TradeNoteTags_AB_unique" ON "_TradeNoteTags"("A", "B");

-- CreateIndex
CREATE INDEX "_TradeNoteTags_B_index" ON "_TradeNoteTags"("B");

-- AddForeignKey
ALTER TABLE "TradeNote" ADD CONSTRAINT "TradeNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeNote" ADD CONSTRAINT "TradeNote_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradeAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeNote" ADD CONSTRAINT "TradeNote_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TradeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TradeNoteTags" ADD CONSTRAINT "_TradeNoteTags_A_fkey" FOREIGN KEY ("A") REFERENCES "TradeNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TradeNoteTags" ADD CONSTRAINT "_TradeNoteTags_B_fkey" FOREIGN KEY ("B") REFERENCES "TradeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

