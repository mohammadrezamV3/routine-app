-- AI Roadmap Builder: رودمپ از «فهرستِ مرحله» به یک گرافِ وابستگی (DAG) تبدیل شد.
-- نودها زیرِ مرحله‌ها می‌نشینند، یال‌ها جدا نگه داشته می‌شوند، و پیشرفت
-- نود‌به‌نود است. همه‌ی ستون‌ها nullable‌اند تا رودمپ‌های قدیمی (که stations
-- دارند و stages ندارند) دست‌نخورده بمانند و با رندرِ قدیمی نشان داده شوند.
ALTER TABLE "Roadmap" ADD COLUMN "stages" JSONB;
ALTER TABLE "Roadmap" ADD COLUMN "connections" JSONB;
ALTER TABLE "Roadmap" ADD COLUMN "nodeProgress" JSONB;
ALTER TABLE "Roadmap" ADD COLUMN "estimatedHours" INTEGER;
ALTER TABLE "Roadmap" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Roadmap" ADD COLUMN "history" JSONB;
