-- خریدِ پلن از اپ موبایل (lib/mobileBilling.ts): «قصدِ خرید» + توکنِ
-- یک‌بارمصرفِ دست‌به‌دادن به وب (فقط SHA-256). اعطای ماژول همچنان فقط در
-- /api/subscription/verify انجام می‌شه.

-- CreateTable
CREATE TABLE "MobileCheckout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "discountCode" TEXT,
    "quotedAmount" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'web',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "tokenUsedAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "openedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileCheckout_tokenHash_key" ON "MobileCheckout"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "MobileCheckout_paymentId_key" ON "MobileCheckout"("paymentId");

-- CreateIndex
CREATE INDEX "MobileCheckout_userId_createdAt_idx" ON "MobileCheckout"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MobileCheckout_createdAt_idx" ON "MobileCheckout"("createdAt");
