-- همگام‌سازیِ آفلاین‌محورِ ماژولِ ترید در اپ اندروید (lib/mobileTradeSync.ts):
-- ستون‌های LWW روی پنج جدولِ ترید، updatedAtِ TradeTag (قبلا نداشت)، و جدولِ
-- tombstoneِ حذف‌ها که با trigger پر می‌شه.

-- AlterTable
ALTER TABLE "TradeAccount" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TradeChecklist" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TradeEntry" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TradeNote" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TradeTag" ADD COLUMN     "syncEditedAt" TIMESTAMP(3),
ADD COLUMN     "syncWrittenAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "TradeSyncTombstone" (
    "userId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeSyncTombstone_pkey" PRIMARY KEY ("userId","entity","entityId")
);

-- CreateIndex
CREATE INDEX "TradeSyncTombstone_userId_updatedAt_idx" ON "TradeSyncTombstone"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "TradeAccount_userId_updatedAt_idx" ON "TradeAccount"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "TradeChecklist_userId_updatedAt_idx" ON "TradeChecklist"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "TradeEntry_userId_updatedAt_idx" ON "TradeEntry"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "TradeTag_userId_updatedAt_idx" ON "TradeTag"("userId", "updatedAt");

-- ─── tombstoneِ حذف‌ها ────────────────────────────────────────────────────
-- روت‌های وب ردیف‌های ترید رو hard-delete می‌کنن (و purgeِ حساب معاملاتش رو
-- cascade پاک می‌کنه). به‌جای اضافه‌کردنِ deletedAt و فیلترکردنش در همه‌ی
-- خواندن‌های وب، هر DELETE روی این پنج جدول ردِ خودش رو این‌جا می‌نویسه تا
-- pullِ موبایل (GET /api/mobile/trade/pull) حذف رو ببینه. زمان‌ها UTC‌ان
-- (ستون‌ها TIMESTAMP بدونِ منطقه‌ان و Prisma همیشه UTC می‌نویسه).
-- deletedAt = شروعِ تراکنش (زمانِ منطقیِ حذف)، updatedAt = لحظه‌ی واقعیِ
-- نوشتن (cursorِ pull). حذف از موبایل بعدش deletedAt رو با clientUpdatedAt
-- بازنویسی می‌کنه (lib/mobileTradeSyncStore.ts).
--
-- وقتی خودِ کاربر حذف می‌شه (cascade از "User")، ردیفِ User دیگه دیده
-- نمی‌شه و هیچ tombstoneی نوشته نمی‌شه — tombstoneِ کاربرِ حذف‌شده بی‌معناست.
CREATE FUNCTION "trade_sync_record_tombstone"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE "id" = OLD."userId") THEN
    INSERT INTO "TradeSyncTombstone" ("userId", "entity", "entityId", "deletedAt", "updatedAt")
    VALUES (OLD."userId", TG_ARGV[0], OLD."id", (now() AT TIME ZONE 'UTC'), (clock_timestamp() AT TIME ZONE 'UTC'))
    ON CONFLICT ("userId", "entity", "entityId")
    DO UPDATE SET "deletedAt" = EXCLUDED."deletedAt", "updatedAt" = EXCLUDED."updatedAt";
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER "TradeAccount_sync_tombstone" AFTER DELETE ON "TradeAccount"
  FOR EACH ROW EXECUTE FUNCTION "trade_sync_record_tombstone"('tradeAccount');
CREATE TRIGGER "TradeTag_sync_tombstone" AFTER DELETE ON "TradeTag"
  FOR EACH ROW EXECUTE FUNCTION "trade_sync_record_tombstone"('tradeTag');
CREATE TRIGGER "TradeChecklist_sync_tombstone" AFTER DELETE ON "TradeChecklist"
  FOR EACH ROW EXECUTE FUNCTION "trade_sync_record_tombstone"('tradeChecklist');
CREATE TRIGGER "TradeEntry_sync_tombstone" AFTER DELETE ON "TradeEntry"
  FOR EACH ROW EXECUTE FUNCTION "trade_sync_record_tombstone"('tradeEntry');
CREATE TRIGGER "TradeNote_sync_tombstone" AFTER DELETE ON "TradeNote"
  FOR EACH ROW EXECUTE FUNCTION "trade_sync_record_tombstone"('tradeNote');
