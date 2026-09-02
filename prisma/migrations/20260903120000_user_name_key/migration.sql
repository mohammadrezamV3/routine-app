-- شکلِ نرمال‌شده‌ی «نام + نام‌خانوادگی»، برای بررسیِ سریعِ تکراری‌نبودن
-- هنگامِ ثبت‌نام. بدونِ این ستون، هر ثبت‌نام باید کلِ جدولِ کاربران را
-- می‌خواند تا نام‌ها را نرمال و مقایسه کند.
ALTER TABLE "User" ADD COLUMN "nameKey" TEXT;

-- بک‌فیلِ کاربرانِ موجود. همان نرمال‌سازیِ `normalizePersonName` در
-- lib/validate.ts: نیم‌فاصله → فاصله، ی/ک عربی → فارسی، حذفِ اعراب،
-- جمع‌کردنِ فاصله‌های پشتِ سر هم، و حروفِ کوچک.
UPDATE "User"
SET "nameKey" = lower(
  regexp_replace(
    trim(
      translate(
        regexp_replace(
          coalesce("name", '') || ' ' || coalesce("lastName", ''),
          '[ً-ْ]', '', 'g'
        ),
        E'‌يىك',
        E' ییک'
      )
    ),
    '\s+', ' ', 'g'
  )
)
WHERE "name" IS NOT NULL AND "lastName" IS NOT NULL;

-- ایندکس عمداً یکتا نیست: داده‌ی موجود ممکن است از قبل نامِ تکراری داشته
-- باشد و یک ایندکسِ یکتا این migration را روی production می‌شکست.
-- یکتایی در روتِ ثبت‌نام اعمال می‌شود.
CREATE INDEX "User_nameKey_idx" ON "User"("nameKey");
