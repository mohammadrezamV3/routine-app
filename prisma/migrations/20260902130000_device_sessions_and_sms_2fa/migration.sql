-- «دستگاه‌های فعال» و «بیرون‌انداختنِ نشست‌های دیگر»: مدلِ Session که تا حالا
-- بلااستفاده بود، حالا نشستِ واقعیِ هر دستگاهه (sid داخلِ JWT به همین اشاره می‌کنه)
ALTER TABLE "Session" ADD COLUMN "provider" TEXT;
ALTER TABLE "Session" ADD COLUMN "ip" TEXT;
ALTER TABLE "Session" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "Session" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Session" ADD COLUMN "revokedAt" TIMESTAMP(3);
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- کدِ یک‌بارمصرفِ ورودِ دومرحله‌ای با پیامک
CREATE TABLE "TwoFactorOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TwoFactorOtp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TwoFactorOtp_userId_idx" ON "TwoFactorOtp"("userId");
ALTER TABLE "TwoFactorOtp" ADD CONSTRAINT "TwoFactorOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
