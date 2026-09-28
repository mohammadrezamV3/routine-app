-- رمزگذاریِ سرتاسریِ خودکار و چنددستگاهی (docs/mentor-e2ee.md)
--   • کلیدِ SYNCED (پشتیبان با کلیدِ مشتق از رمزِ عبور) یا DEVICE (فقط روی یک دستگاه)
--   • پیامِ scheme 2: کلیدِ محتوای تصادفی، بسته‌بندی‌شده برای هر کلیدِ فعالِ دو طرف
--   • درخواستِ انتقالِ سابقه بینِ دستگاه‌های یک کاربر

-- ── کلیدها ──
CREATE TYPE "E2EKeyKind" AS ENUM ('SYNCED', 'DEVICE');

ALTER TABLE "UserE2EKey"
    ADD COLUMN "kind" "E2EKeyKind" NOT NULL DEFAULT 'SYNCED',
    ADD COLUMN "backupKind" TEXT,
    ADD COLUMN "activeSyncedFor" TEXT,
    ADD COLUMN "deviceLabel" TEXT,
    ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- پشتیبان‌های موجود با «رمز گفت‌وگو»ی قدیمی ساخته شده‌اند
UPDATE "UserE2EKey" SET "backupKind" = 'PASSCODE' WHERE "backupCiphertext" IS NOT NULL;
-- تا امروز هر کاربر حداکثر یک کلیدِ فعال داشت؛ همان کلیدِ SYNCEDِ فعالِ اوست
UPDATE "UserE2EKey" SET "activeSyncedFor" = "userId" WHERE "retiredAt" IS NULL;

CREATE UNIQUE INDEX "UserE2EKey_activeSyncedFor_key" ON "UserE2EKey"("activeSyncedFor");

-- ── نمکِ کلیدِ مشتق از رمزِ عبور ──
CREATE TABLE "UserE2EKdf" (
    "userId" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserE2EKdf_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserE2EKdf" ADD CONSTRAINT "UserE2EKdf_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── پیام‌ها: scheme 2 ──
ALTER TABLE "MentorMessage"
    ADD COLUMN "scheme" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "keyFromId" TEXT;

CREATE TABLE "MentorMessageKeyWrap" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "wrap" TEXT NOT NULL,
    "viaVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMessageKeyWrap_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MentorMessageKeyWrap_messageId_userId_keyVersion_key" ON "MentorMessageKeyWrap"("messageId", "userId", "keyVersion");
CREATE INDEX "MentorMessageKeyWrap_userId_keyVersion_idx" ON "MentorMessageKeyWrap"("userId", "keyVersion");
ALTER TABLE "MentorMessageKeyWrap" ADD CONSTRAINT "MentorMessageKeyWrap_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "MentorMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- شکلِ ردیف: recipientKeyVersion فقط در scheme 1 لازم است
ALTER TABLE "MentorMessage" DROP CONSTRAINT "MentorMessage_e2ee_shape";
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_e2ee_shape" CHECK (
    ("legacyBody" IS NOT NULL AND "ciphertext" IS NULL)
    OR (
        "legacyBody" IS NULL AND "ciphertext" IS NOT NULL AND "iv" IS NOT NULL AND "clientId" IS NOT NULL
        AND "senderKeyVersion" IS NOT NULL AND "commitment" IS NOT NULL AND "serverTag" IS NOT NULL
        AND ("scheme" = 2 OR "recipientKeyVersion" IS NOT NULL)
    )
);
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_scheme_check" CHECK ("scheme" IN (1, 2));

-- ── انتقالِ سابقه ──
CREATE TABLE "E2EDeviceLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "moved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "E2EDeviceLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "E2EDeviceLink_userId_status_idx" ON "E2EDeviceLink"("userId", "status");
ALTER TABLE "E2EDeviceLink" ADD CONSTRAINT "E2EDeviceLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
