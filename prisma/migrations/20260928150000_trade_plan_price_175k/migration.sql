-- قیمتِ ماهانه‌ی پلنِ ترید (بازار ایران): ۱۵۰,۰۰۰ → ۱۷۵,۰۰۰ تومان.
-- واحد ریال است (تومان × ۱۰)، هم‌راستا با prisma/seed.ts. فقط ردیفی که هنوز
-- روی قیمتِ قبلی است عوض می‌شود تا تغییرِ دستیِ ادمین بازنویسی نشود.
-- priceYearly این پلن از اول NULL بوده و دست نمی‌خورد؛ مبلغِ واقعیِ چک‌اوتِ
-- ۱/۳/۶/۱۲ ماهه از lib/planPricing.ts خوانده می‌شود (همان‌جا هم به‌روز شد).

UPDATE "Plan"
SET "priceMonthly" = 1750000,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'trade'
  AND "market" = 'IRAN'
  AND "priceMonthly" = 1500000;
