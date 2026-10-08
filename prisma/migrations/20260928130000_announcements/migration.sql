-- اطلاعیه‌های سراسریِ اپ (پنل ادمین → /admin/announcements، نمایش در پنلِ زنگوله).
-- متنِ ساده؛ وضعیتِ «خوانده‌شده» سمتِ کاربر در UserSetting/localStorage (readAnnouncements).

CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_active_createdAt_idx" ON "Announcement"("active", "createdAt");
