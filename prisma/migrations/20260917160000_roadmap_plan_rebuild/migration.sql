-- بازسازیِ رودمپ: «راهنمای متنی + مرحله‌ها» جایگزینِ همه‌ی نسخه‌های قبلی
-- (ایستگاه‌ها، و گرافِ وابستگی) می‌شود.
--
-- هشدار: این migration ستون‌های محتوای رودمپ‌های قدیمی را حذف می‌کند.
-- رودمپ‌های موجود (عنوان/موضوع/هدف) می‌مانند ولی محتوایشان با ساختارِ
-- جدید خوانده نمی‌شود و باید دوباره ساخته شوند — این دقیقاً همان
-- «حذف کن و از اول بساز»ی‌ست که خواسته شده.

-- ستون‌های ساختارِ جدید
ALTER TABLE "Roadmap" ADD COLUMN     "summary" TEXT;
ALTER TABLE "Roadmap" ADD COLUMN     "guide" TEXT;
ALTER TABLE "Roadmap" ADD COLUMN     "steps" JSONB;
ALTER TABLE "Roadmap" ADD COLUMN     "totalDuration" TEXT;
ALTER TABLE "Roadmap" ADD COLUMN     "tools" JSONB;

-- ستون‌های نسخه‌ی ایستگاهی و نسخه‌ی گراف
ALTER TABLE "Roadmap" DROP COLUMN "stations";
ALTER TABLE "Roadmap" DROP COLUMN "stages";
ALTER TABLE "Roadmap" DROP COLUMN "connections";
ALTER TABLE "Roadmap" DROP COLUMN "nodeProgress";
ALTER TABLE "Roadmap" DROP COLUMN "version";
ALTER TABLE "Roadmap" DROP COLUMN "history";
ALTER TABLE "Roadmap" DROP COLUMN "estimatedHours";
ALTER TABLE "Roadmap" DROP COLUMN "tracks";
ALTER TABLE "Roadmap" DROP COLUMN "certifications";
ALTER TABLE "Roadmap" DROP COLUMN "projects";
ALTER TABLE "Roadmap" DROP COLUMN "tips";
ALTER TABLE "Roadmap" DROP COLUMN "proTips";
ALTER TABLE "Roadmap" DROP COLUMN "books";
ALTER TABLE "Roadmap" DROP COLUMN "mistakes";
ALTER TABLE "Roadmap" DROP COLUMN "answers";
ALTER TABLE "Roadmap" DROP COLUMN "deadlineMonths";
ALTER TABLE "Roadmap" DROP COLUMN "resourceLang";
ALTER TABLE "Roadmap" DROP COLUMN "budget";
ALTER TABLE "Roadmap" DROP COLUMN "learnStyle";
ALTER TABLE "Roadmap" DROP COLUMN "level";
ALTER TABLE "Roadmap" DROP COLUMN "totalWeeks";
ALTER TABLE "Roadmap" DROP COLUMN "outcome";
ALTER TABLE "Roadmap" DROP COLUMN "note";
ALTER TABLE "Roadmap" DROP COLUMN "schedule";

-- پیشرفتِ قدیمی با اندیسِ آرایه کلید می‌خورد و با شماره‌ی مرحله‌ی جدید
-- یکی نیست؛ ماندنش یعنی مرحله‌های اشتباهی تیک‌خورده.
UPDATE "Roadmap" SET "progress" = NULL;
