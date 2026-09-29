-- ماژول‌های پایه (روتین/خواب/کارها — BASIC_MODULES در lib/modules.ts و پلنِ
-- basic در prisma/seed.ts) از این به بعد برای همه همیشه رایگان‌اند.
-- قبلا ثبت‌نام با انقضای ۱۴روزه می‌ساختشان و خریدِ پلن هم با انقضای دوره‌ی
-- اشتراک بازنویسی‌شان می‌کرد. منطقِ دسترسی حالا خودش پایه‌ها را باز حساب
-- می‌کند؛ این مایگریشن فقط داده‌ی موجود را هم هم‌راستا می‌کند تا جاهایی که
-- مستقیم ردیف‌ها را می‌خوانند (آمار ادمین، پنل کاربر در ادمین) هم درست ببینند.

-- ۱) ردیف‌های موجود: فعال و بی‌انقضا
UPDATE "ModuleAccess"
SET "active" = true,
    "expiresAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "module" IN ('ROUTINE', 'SLEEP', 'TASKS')
  AND ("active" = false OR "expiresAt" IS NOT NULL);

-- ۲) کاربرانی که ردیفِ پایه ندارند
INSERT INTO "ModuleAccess" ("id", "userId", "module", "active", "expiresAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", m."module"::"ModuleKey", true, NULL, CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN (VALUES ('ROUTINE'), ('SLEEP'), ('TASKS')) AS m("module")
ON CONFLICT ("userId", "module") DO NOTHING;
