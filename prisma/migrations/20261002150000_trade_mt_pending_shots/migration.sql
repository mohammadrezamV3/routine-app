-- اسکرین‌های اکسپرت که قبل از sync خود معامله رسیدن؛ sync بعدی وصلشون می‌کنه

CREATE TABLE "TradeMtPendingShot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeMtPendingShot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TradeMtPendingShot_accountId_externalId_kind_key" ON "TradeMtPendingShot"("accountId", "externalId", "kind");
CREATE INDEX "TradeMtPendingShot_accountId_createdAt_idx" ON "TradeMtPendingShot"("accountId", "createdAt");

ALTER TABLE "TradeMtPendingShot" ADD CONSTRAINT "TradeMtPendingShot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
