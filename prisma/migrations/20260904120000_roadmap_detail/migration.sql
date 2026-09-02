-- فیلدهای تازه‌ی رودمپ: اشتباه‌های رایج، سطحِ شروع و برآوردِ کلِ زمان.
-- هر سه nullable هستند چون رودمپ‌های ساخته‌شده پیش از این نسخه ندارندشان
-- و نباید migration روی داده‌ی موجود بشکند.
ALTER TABLE "Roadmap" ADD COLUMN "mistakes" JSONB;
ALTER TABLE "Roadmap" ADD COLUMN "level" TEXT;
ALTER TABLE "Roadmap" ADD COLUMN "totalWeeks" INTEGER;

-- پیشرفتِ مرحله‌ها. پیش از این با یک کلیدِ پویا در UserSetting ذخیره
-- می‌شد که در allowlistِ کلیدها نبود و برای کاربرِ واردشده ۴۰۰ می‌گرفت.
ALTER TABLE "Roadmap" ADD COLUMN "progress" JSONB;
