-- اطلاعیه‌ها: پاپ‌آپ، بنر/کارت گوشه، مخاطب، زمان‌بندی و بستن ماندگار.
-- پیش‌فرض‌ها اطلاعیه‌های قبلی رو «فقط در لیست اعلان‌ها» نگه می‌دارن.

CREATE TYPE "AnnouncementDisplay" AS ENUM ('NONE', 'POPUP', 'BANNER');
CREATE TYPE "AnnouncementPosition" AS ENUM ('TOP', 'BOTTOM', 'TOP_RIGHT', 'TOP_LEFT', 'BOTTOM_RIGHT', 'BOTTOM_LEFT');
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'USERS', 'GUESTS', 'PAID', 'FREE');
CREATE TYPE "AnnouncementTone" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'PROMO');
CREATE TYPE "AnnouncementFrequency" AS ENUM ('ONCE', 'UNTIL_DISMISSED');

ALTER TABLE "Announcement"
    ADD COLUMN "startsAt" TIMESTAMP(3),
    ADD COLUMN "showInList" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "display" "AnnouncementDisplay" NOT NULL DEFAULT 'NONE',
    ADD COLUMN "position" "AnnouncementPosition" NOT NULL DEFAULT 'TOP',
    ADD COLUMN "pages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    ADD COLUMN "tone" "AnnouncementTone" NOT NULL DEFAULT 'INFO',
    ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "dismissible" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "frequency" "AnnouncementFrequency" NOT NULL DEFAULT 'UNTIL_DISMISSED',
    ADD COLUMN "ctaLabel" TEXT,
    ADD COLUMN "ctaUrl" TEXT,
    ADD COLUMN "imageUrl" TEXT;

CREATE INDEX "Announcement_active_display_idx" ON "Announcement"("active", "display");

CREATE TABLE "AnnouncementDismissal" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementDismissal_pkey" PRIMARY KEY ("announcementId","userId")
);

CREATE INDEX "AnnouncementDismissal_userId_idx" ON "AnnouncementDismissal"("userId");

ALTER TABLE "AnnouncementDismissal" ADD CONSTRAINT "AnnouncementDismissal_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementDismissal" ADD CONSTRAINT "AnnouncementDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
