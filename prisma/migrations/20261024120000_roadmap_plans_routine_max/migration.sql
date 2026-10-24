-- رودمپ فقط در پلن «روتین من» (basic) و مکس: از پلن‌های exercise و trade برداشته
-- و به basic اضافه می‌شود (بازار ایران و هر بازار دیگر با همان کلید). هم‌راستا با prisma/seed.ts.
-- ModuleAccess کاربران دست نمی‌خورد: دسترسی قبلا خریداری‌شده تا انقضا می‌ماند.
-- idempotent: اجرای دوباره اثری ندارد.

DELETE FROM "PlanModule"
WHERE "module" = 'ROADMAP'
  AND "planId" IN (SELECT "id" FROM "Plan" WHERE "key" IN ('exercise', 'trade'));

INSERT INTO "PlanModule" ("id", "planId", "module")
SELECT 'pm_roadmap_' || p."id", p."id", 'ROADMAP'::"ModuleKey"
FROM "Plan" p
WHERE p."key" = 'basic'
ON CONFLICT ("planId", "module") DO NOTHING;
