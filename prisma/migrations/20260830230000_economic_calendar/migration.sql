-- تقویم اقتصادی — جدولِ رویدادها. منبعِ پیش‌فرض ورودِ دستیِ ادمین
-- است؛ کلیدِ یکتای (source, externalId) برای وقتی است که یک فیدِ
-- واقعی تنظیم شود و نباید رکوردِ تکراری بسازد.
-- CreateEnum
CREATE TYPE "EconomicImpact" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "EconomicEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "impact" "EconomicImpact" NOT NULL,
    "occursAt" TIMESTAMP(3) NOT NULL,
    "actual" TEXT,
    "forecast" TEXT,
    "previous" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomicEvent_occursAt_idx" ON "EconomicEvent"("occursAt");

-- CreateIndex
CREATE INDEX "EconomicEvent_currency_occursAt_idx" ON "EconomicEvent"("currency", "occursAt");

-- CreateIndex
CREATE UNIQUE INDEX "EconomicEvent_source_externalId_key" ON "EconomicEvent"("source", "externalId");

