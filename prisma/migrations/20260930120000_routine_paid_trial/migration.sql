-- «روتین من» (ROUTINE/SLEEP/TASKS) دیگه رایگانِ دائمی نیست: ۱۴ روز آزمایشی،
-- بعد پلنِ «روتین من» (ماهانه ۹۹ هزار تومان) یا هر پلنِ پولیِ دیگه.
-- مایگریشنِ 20260928160000_basic_modules_free_forever این ردیف‌ها رو بی‌انقضا
-- کرده بود؛ این‌جا برعکس می‌شه، با مهلتِ منصفانه برای کاربرانِ فعلی:
--   • هر کس اشتراکِ فعالی با پلنی شاملِ اون ماژول داره → تا پایانِ دوره‌اش
--     (و حداقل ۱۴ روز از الان)
--   • بقیه → ۱۴ روز از همین الان (نه از تاریخِ ثبت‌نام — کسی یک‌شبه قفل نشه)

-- ۱) پلنِ basic → «روتین من»، ۹۹ هزار تومان (ریال)
UPDATE "Plan"
SET "nameFa" = 'روتین من',
    "nameEn" = 'My Routine',
    "priceMonthly" = 990000,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'basic';

-- ۲) ردیف‌های بی‌انقضای ماژول‌های روتین → مهلت
UPDATE "ModuleAccess" ma
SET "expiresAt" = GREATEST(
      NOW() + INTERVAL '14 days',
      COALESCE((
        SELECT MAX(s."currentPeriodEnd")
        FROM "Subscription" s
        JOIN "PlanModule" pm ON pm."planId" = s."planId"
        WHERE s."userId" = ma."userId"
          AND pm."module" = ma."module"
          AND s."status" IN ('ACTIVE', 'TRIAL')
      ), NOW())
    ),
    "active" = true,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE ma."module" IN ('ROUTINE', 'SLEEP', 'TASKS')
  AND ma."expiresAt" IS NULL;
