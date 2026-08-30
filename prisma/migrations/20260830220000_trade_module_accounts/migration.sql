-- بازنویسیِ ماژولِ ترید: حساب معاملاتی › معامله › چک‌لیستِ نام‌دار › برچسب › عکس
--
-- این migration عمداً دست‌نویسه، نه خروجیِ خامِ `prisma migrate dev`. دلیلش
-- ستون‌های NOT NULLِ جدیدیه که روی جدولِ *پر* اضافه می‌شن (accountId، symbol،
-- direction، result، checklistId): خروجیِ خودکار مستقیم NOT NULL می‌زنه و
-- روی هر دیتابیسی که حتی یک ردیفِ ترید داشته باشه می‌شکنه. پس ترتیبِ امنِ
-- «ستونِ nullable → پرکردنِ داده → NOT NULL» رعایت شده و هیچ معامله‌ای از
-- بین نمی‌ره — معاملاتِ قبلی به یک حسابِ پیش‌فرض («حساب اصلی») منتقل می‌شن و
-- آیتم‌های چک‌لیستِ تختِ قبلی به یک چک‌لیستِ پیش‌فرض («چک‌لیست من»).

-- ── ۱) Enumها ───────────────────────────────────────────────────────────────
CREATE TYPE "TradeAccountType" AS ENUM ('REAL', 'DEMO', 'PROP', 'BACKTEST');
CREATE TYPE "TradeGoalType" AS ENUM ('AMOUNT', 'PERCENT');
CREATE TYPE "TradeDirection" AS ENUM ('BUY', 'SELL');
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELED');
CREATE TYPE "TradeResult" AS ENUM ('PROFIT', 'LOSS', 'BREAKEVEN');
CREATE TYPE "TradeSession" AS ENUM ('SYDNEY', 'TOKYO', 'LONDON', 'NEWYORK');
CREATE TYPE "TradeEntryReason" AS ENUM ('STRATEGY', 'TECHNICAL_SIGNAL', 'FUNDAMENTAL_SIGNAL', 'NEWS', 'INTUITION', 'OTHERS_ADVICE', 'FOMO', 'REVENGE', 'OTHER');
CREATE TYPE "TradeExitReason" AS ENUM ('TAKE_PROFIT', 'STOP_LOSS', 'MANUAL', 'TRAILING_STOP', 'MARKET_CHANGE', 'EMOTIONAL', 'TIME_BASED', 'OTHER');
CREATE TYPE "TradeEmotionBefore" AS ENUM ('CALM', 'NEUTRAL', 'EXCITED', 'ANXIOUS', 'ANGRY', 'OVERCONFIDENT');
CREATE TYPE "TradeEmotionAfter" AS ENUM ('SATISFIED', 'RELIEVED', 'INDIFFERENT', 'ANXIOUS', 'REGRET', 'ANGRY');

-- ── ۲) جدول‌های جدید ────────────────────────────────────────────────────────
CREATE TABLE "TradeAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "broker" TEXT,
    "type" "TradeAccountType" NOT NULL DEFAULT 'REAL',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leverage" INTEGER,
    "color" TEXT NOT NULL DEFAULT '#00A86B',
    "note" TEXT,
    "goalType" "TradeGoalType" NOT NULL DEFAULT 'AMOUNT',
    "goalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TradeAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3E7BFA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradeTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeChecklist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3E7BFA',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TradeChecklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeImage" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradeImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_TradeAccountTags" ( "A" TEXT NOT NULL, "B" TEXT NOT NULL );
CREATE TABLE "_TradeEntryTags"   ( "A" TEXT NOT NULL, "B" TEXT NOT NULL );

CREATE INDEX "TradeAccount_userId_archived_idx" ON "TradeAccount"("userId", "archived");
CREATE INDEX "TradeTag_userId_idx" ON "TradeTag"("userId");
CREATE UNIQUE INDEX "TradeTag_userId_name_key" ON "TradeTag"("userId", "name");
CREATE INDEX "TradeChecklist_userId_archived_idx" ON "TradeChecklist"("userId", "archived");
CREATE INDEX "TradeImage_entryId_idx" ON "TradeImage"("entryId");
CREATE UNIQUE INDEX "_TradeAccountTags_AB_unique" ON "_TradeAccountTags"("A", "B");
CREATE INDEX "_TradeAccountTags_B_index" ON "_TradeAccountTags"("B");
CREATE UNIQUE INDEX "_TradeEntryTags_AB_unique" ON "_TradeEntryTags"("A", "B");
CREATE INDEX "_TradeEntryTags_B_index" ON "_TradeEntryTags"("B");

ALTER TABLE "TradeAccount" ADD CONSTRAINT "TradeAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeTag" ADD CONSTRAINT "TradeTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeChecklist" ADD CONSTRAINT "TradeChecklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TradeAccountTags" ADD CONSTRAINT "_TradeAccountTags_A_fkey" FOREIGN KEY ("A") REFERENCES "TradeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TradeAccountTags" ADD CONSTRAINT "_TradeAccountTags_B_fkey" FOREIGN KEY ("B") REFERENCES "TradeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ۳) چک‌لیست: لیستِ تختِ قبلی → یک چک‌لیستِ نام‌دارِ پیش‌فرض برای هر کاربر ──
INSERT INTO "TradeChecklist" ("id", "userId", "name", "order", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, i."userId", 'چک‌لیست من', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "userId" FROM "TradeChecklistItem") i;

ALTER TABLE "TradeChecklistItem" ADD COLUMN "checklistId" TEXT;

UPDATE "TradeChecklistItem" it
SET "checklistId" = c."id"
FROM "TradeChecklist" c
WHERE c."userId" = it."userId";

-- آیتمِ یتیم (کاربرش پاک شده) نمی‌تونه به چک‌لیستی وصل بشه — حذفش تنها راهِ NOT NULL شدنه
DELETE FROM "TradeChecklistItem" WHERE "checklistId" IS NULL;

ALTER TABLE "TradeChecklistItem" ALTER COLUMN "checklistId" SET NOT NULL;
ALTER TABLE "TradeChecklistItem" DROP CONSTRAINT "TradeChecklistItem_userId_fkey";
DROP INDEX "TradeChecklistItem_userId_idx";
ALTER TABLE "TradeChecklistItem" DROP COLUMN "userId";
CREATE INDEX "TradeChecklistItem_checklistId_idx" ON "TradeChecklistItem"("checklistId");
ALTER TABLE "TradeChecklistItem" ADD CONSTRAINT "TradeChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "TradeChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ۴) معاملات: هر کاربرِ دارای معامله یک «حساب اصلی» می‌گیره ────────────────
INSERT INTO "TradeAccount" ("id", "userId", "name", "type", "currency", "order", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, e."userId", 'حساب اصلی', 'REAL', 'USD', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "userId" FROM "TradeEntry") e;

ALTER TABLE "TradeEntry"
    ADD COLUMN "accountId" TEXT,
    ADD COLUMN "symbol" TEXT,
    ADD COLUMN "direction_new" "TradeDirection",
    ADD COLUMN "result" "TradeResult",
    ADD COLUMN "status" "TradeStatus" NOT NULL DEFAULT 'CLOSED',
    ADD COLUMN "volumeUnit" TEXT NOT NULL DEFAULT 'LOT',
    ADD COLUMN "riskFree" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "timeframe" TEXT,
    ADD COLUMN "commission" DOUBLE PRECISION,
    ADD COLUMN "swap" DOUBLE PRECISION,
    ADD COLUMN "riskAmount" DOUBLE PRECISION,
    ADD COLUMN "rMultiple" DOUBLE PRECISION,
    ADD COLUMN "sessions" "TradeSession"[] DEFAULT ARRAY[]::"TradeSession"[],
    ADD COLUMN "setup" TEXT,
    ADD COLUMN "entryReasons" "TradeEntryReason"[] DEFAULT ARRAY[]::"TradeEntryReason"[],
    ADD COLUMN "exitReasons" "TradeExitReason"[] DEFAULT ARRAY[]::"TradeExitReason"[],
    ADD COLUMN "entryReasonNote" TEXT,
    ADD COLUMN "exitReasonNote" TEXT,
    ADD COLUMN "note" TEXT,
    ADD COLUMN "emotionBefore" "TradeEmotionBefore",
    ADD COLUMN "emotionAfter" "TradeEmotionAfter",
    ADD COLUMN "confidence" INTEGER,
    ADD COLUMN "followedPlan" BOOLEAN,
    ADD COLUMN "checklistId" TEXT,
    ADD COLUMN "checklistName" TEXT,
    ADD COLUMN "checklistDone" INTEGER,
    ADD COLUMN "checklistTotal" INTEGER,
    ADD COLUMN "checklistSnapshot" JSONB;

UPDATE "TradeEntry" e
SET "accountId"     = a."id",
    "symbol"        = e."pair",
    "direction_new" = (CASE WHEN e."direction" = 'short' THEN 'SELL' ELSE 'BUY' END)::"TradeDirection",
    "note"          = e."notes",
    "setup"         = e."strategy",
    "volume"        = COALESCE(e."volume", e."lotSize", 0),
    "pnl"           = COALESCE(e."pnl", 0),
    "status"        = (CASE WHEN e."exitPrice" IS NULL THEN 'OPEN' ELSE 'CLOSED' END)::"TradeStatus",
    "result"        = (CASE
                         WHEN COALESCE(e."pnl", 0) > 0 THEN 'PROFIT'
                         WHEN COALESCE(e."pnl", 0) < 0 THEN 'LOSS'
                         ELSE 'BREAKEVEN'
                       END)::"TradeResult",
    "sessions"      = ARRAY[]::"TradeSession"[],
    "entryReasons"  = ARRAY[]::"TradeEntryReason"[],
    "exitReasons"   = ARRAY[]::"TradeExitReason"[]
FROM "TradeAccount" a
WHERE a."userId" = e."userId" AND a."name" = 'حساب اصلی';

-- عکسِ تکِ قبلی (data URL روی خودِ ردیف) → جدولِ جداگانه‌ی عکس‌ها
INSERT INTO "TradeImage" ("id", "entryId", "dataUrl", "order", "createdAt")
SELECT gen_random_uuid()::text, e."id", e."screenshotUrl", 0, CURRENT_TIMESTAMP
FROM "TradeEntry" e
WHERE e."screenshotUrl" IS NOT NULL AND e."screenshotUrl" <> '';

DELETE FROM "TradeEntry" WHERE "accountId" IS NULL;

ALTER TABLE "TradeEntry"
    ALTER COLUMN "accountId" SET NOT NULL,
    ALTER COLUMN "symbol" SET NOT NULL,
    ALTER COLUMN "result" SET NOT NULL,
    ALTER COLUMN "volume" SET NOT NULL,
    ALTER COLUMN "pnl" SET NOT NULL,
    ALTER COLUMN "pnl" SET DEFAULT 0,
    ALTER COLUMN "entryPrice" DROP NOT NULL;

ALTER TABLE "TradeEntry" DROP COLUMN "direction";
ALTER TABLE "TradeEntry" RENAME COLUMN "direction_new" TO "direction";
ALTER TABLE "TradeEntry" ALTER COLUMN "direction" SET NOT NULL;

ALTER TABLE "TradeEntry"
    DROP COLUMN "pair",
    DROP COLUMN "lotSize",
    DROP COLUMN "notes",
    DROP COLUMN "strategy",
    DROP COLUMN "riskPercent",
    DROP COLUMN "screenshotUrl";

CREATE INDEX "TradeEntry_accountId_openedAt_idx" ON "TradeEntry"("accountId", "openedAt");
CREATE INDEX "TradeEntry_checklistId_idx" ON "TradeEntry"("checklistId");
ALTER TABLE "TradeEntry" ADD CONSTRAINT "TradeEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeEntry" ADD CONSTRAINT "TradeEntry_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "TradeChecklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TradeImage" ADD CONSTRAINT "TradeImage_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TradeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TradeEntryTags" ADD CONSTRAINT "_TradeEntryTags_A_fkey" FOREIGN KEY ("A") REFERENCES "TradeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TradeEntryTags" ADD CONSTRAINT "_TradeEntryTags_B_fkey" FOREIGN KEY ("B") REFERENCES "TradeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DEFAULTِ آرایه‌ها فقط برای پرکردنِ ردیف‌های موجود لازم بود (وگرنه NULL
-- می‌موندن). حالا برداشته می‌شن تا وضعیتِ نهاییِ دیتابیس دقیقاً همون چیزی
-- باشه که schema.prisma توصیف می‌کنه و migrate بعدی دریفت نبینه.
ALTER TABLE "TradeEntry"
    ALTER COLUMN "sessions" DROP DEFAULT,
    ALTER COLUMN "entryReasons" DROP DEFAULT,
    ALTER COLUMN "exitReasons" DROP DEFAULT;
