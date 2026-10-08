-- بازسازیِ رودمپ: خروجیِ مدل حالا به‌جای یک فهرستِ سرفصل، یک مسیرِ کامل است
-- (چه حوزه‌هایی و با چه ترتیبی باید خوانده شوند، مدرک‌ها، پروژه‌ها، خروجیِ
-- نهایی) و ساختش هم دو مرحله‌ای شده (سوال‌های مخصوصِ موضوع، بعد ساخت).
-- همه‌ی ستون‌ها nullable‌اند تا رودمپ‌های قبلی دست‌نخورده باقی بمانند.
ALTER TABLE "Roadmap" ADD COLUMN "outcome" TEXT;
ALTER TABLE "Roadmap" ADD COLUMN "tracks" JSONB;
ALTER TABLE "Roadmap" ADD COLUMN "certifications" JSONB;
ALTER TABLE "Roadmap" ADD COLUMN "projects" JSONB;
ALTER TABLE "Roadmap" ADD COLUMN "answers" JSONB;
ALTER TABLE "Roadmap" ADD COLUMN "deadlineMonths" INTEGER;
ALTER TABLE "Roadmap" ADD COLUMN "resourceLang" TEXT;
ALTER TABLE "Roadmap" ADD COLUMN "budget" TEXT;
ALTER TABLE "Roadmap" ADD COLUMN "learnStyle" TEXT;
