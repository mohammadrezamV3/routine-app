-- AlterTable
ALTER TABLE "TradeEntry" ADD COLUMN     "screenshotUrl" TEXT,
ADD COLUMN     "stopLoss" DOUBLE PRECISION,
ADD COLUMN     "strategy" TEXT,
ADD COLUMN     "takeProfit" DOUBLE PRECISION;
