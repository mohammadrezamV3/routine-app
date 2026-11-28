-- شمارنده‌ی مشترک محدودکننده‌ی درخواست بین workerها
CREATE TABLE "RateCounter" (
    "key" TEXT NOT NULL,
    "bucket" BIGINT NOT NULL,
    "policy" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCounter_pkey" PRIMARY KEY ("key","bucket")
);

CREATE INDEX "RateCounter_expiresAt_idx" ON "RateCounter"("expiresAt");
CREATE INDEX "RateCounter_policy_bucket_idx" ON "RateCounter"("policy", "bucket");
