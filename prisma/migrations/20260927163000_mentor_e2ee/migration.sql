-- رمزگذاریِ سرتاسریِ گفت‌وگوی منتور (docs/mentor-e2ee.md)

-- ── کلیدهای هویت ──
CREATE TABLE "UserE2EKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "backupCiphertext" TEXT,
    "backupIv" TEXT,
    "backupSalt" TEXT,
    "backupIterations" INTEGER,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserE2EKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserE2EKey_userId_version_key" ON "UserE2EKey"("userId", "version");
CREATE INDEX "UserE2EKey_userId_retiredAt_idx" ON "UserE2EKey"("userId", "retiredAt");

ALTER TABLE "UserE2EKey" ADD CONSTRAINT "UserE2EKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── پیام‌ها: متنِ ساده → legacyBody؛ ستون‌های رمزشده ──
ALTER TABLE "MentorMessage" RENAME COLUMN "body" TO "legacyBody";
ALTER TABLE "MentorMessage" ALTER COLUMN "legacyBody" DROP NOT NULL;
ALTER TABLE "MentorMessage"
    ADD COLUMN "clientId" TEXT,
    ADD COLUMN "ciphertext" TEXT,
    ADD COLUMN "iv" TEXT,
    ADD COLUMN "senderKeyVersion" INTEGER,
    ADD COLUMN "recipientKeyVersion" INTEGER,
    ADD COLUMN "commitment" TEXT,
    ADD COLUMN "serverTag" TEXT,
    ADD COLUMN "broadcastId" TEXT;

CREATE UNIQUE INDEX "MentorMessage_mentorshipId_clientId_key" ON "MentorMessage"("mentorshipId", "clientId");

-- گزارش‌های قبلیِ پیام: متنِ *همان* پیامِ گزارش‌شده به خودِ گزارش منتقل می‌شود
-- (قبل از این مهاجرت ادمین آن را زنده از جدولِ پیام می‌خواند)
ALTER TABLE "MentorReport"
    ADD COLUMN "reportedText" TEXT,
    ADD COLUMN "reportedMessageAt" TIMESTAMP(3),
    ADD COLUMN "reportVerified" BOOLEAN NOT NULL DEFAULT false;

UPDATE "MentorReport" r
SET "reportedText" = m."legacyBody", "reportedMessageAt" = m."createdAt"
FROM "MentorMessage" m
WHERE r."targetType" = 'MESSAGE' AND r."targetId" = m."id";

-- هر پیام یا قدیمی (فقط legacyBody) است یا کاملاً رمزشده — هرگز هر دو، هرگز هیچ‌کدام
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_e2ee_shape" CHECK (
    ("legacyBody" IS NOT NULL AND "ciphertext" IS NULL)
    OR (
        "legacyBody" IS NULL AND "ciphertext" IS NOT NULL AND "iv" IS NOT NULL AND "clientId" IS NOT NULL
        AND "senderKeyVersion" IS NOT NULL AND "recipientKeyVersion" IS NOT NULL
        AND "commitment" IS NOT NULL AND "serverTag" IS NOT NULL
    )
);
