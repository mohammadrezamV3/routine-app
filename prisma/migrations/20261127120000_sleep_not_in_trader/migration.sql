-- خواب فقط در پلن‌های «روتین من» (basic)، Gym (exercise) و Max؛ از پلن Trader برداشته می‌شه.
-- هم‌راستا با prisma/seed.ts. ModuleAccess کاربران دست نمی‌خوره: هر دسترسی خواب که قبلا
-- با پلن ترید گرفته شده تا انقضای خودش می‌مونه و کوتاه یا حذف نمی‌شه.
-- idempotent: اجرای دوباره اثری ندارد.

DELETE FROM "PlanModule"
WHERE "module" = 'SLEEP'
  AND "planId" IN (SELECT "id" FROM "Plan" WHERE "key" = 'trade');

INSERT INTO "PlanModule" ("id", "planId", "module")
SELECT 'pm_sleep_' || p."id", p."id", 'SLEEP'::"ModuleKey"
FROM "Plan" p
WHERE p."key" IN ('basic', 'exercise', 'max')
ON CONFLICT ("planId", "module") DO NOTHING;
