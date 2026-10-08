-- گردش پول غیرمعاملاتی حساب‌های متصل به متاتریدر (واریز/برداشت/هزینه/مالیات/...)

CREATE TABLE "TradeCashflow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeCashflow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TradeCashflow_accountId_externalId_key" ON "TradeCashflow"("accountId", "externalId");
CREATE INDEX "TradeCashflow_accountId_occurredAt_idx" ON "TradeCashflow"("accountId", "occurredAt");

ALTER TABLE "TradeCashflow" ADD CONSTRAINT "TradeCashflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeCashflow" ADD CONSTRAINT "TradeCashflow_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
