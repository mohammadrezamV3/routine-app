-- ارقامِ کلِ سایت انگلیسی شد. متنِ حرکت‌های برنامه‌ی ورزشی (قالب‌های
-- lib/exercisePlans.ts و خروجیِ AI، مثلا «اسکوات ۴×۱۰») با ارقامِ فارسی ذخیره
-- شده بود؛ این‌جا به لاتین تبدیل می‌شه. completedItems ِ لاگ‌ها همون متن‌ها رو
-- نگه می‌داره، پس هم‌زمان تبدیل می‌شه تا تیک‌های قبلی با حرکت‌ها جور بمونن.
-- ارقامِ فارسی فقط داخلِ رشته‌های JSON‌اند، پس translate روی متنِ JSON امنه.

UPDATE "ExercisePlan"
SET "planData" = translate("planData"::text, '۰۱۲۳۴۵۶۷۸۹', '0123456789')::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "planData"::text ~ '[۰-۹]';

UPDATE "ExerciseLog"
SET "completedItems" = translate("completedItems"::text, '۰۱۲۳۴۵۶۷۸۹', '0123456789')::jsonb
WHERE "completedItems" IS NOT NULL AND "completedItems"::text ~ '[۰-۹]';
