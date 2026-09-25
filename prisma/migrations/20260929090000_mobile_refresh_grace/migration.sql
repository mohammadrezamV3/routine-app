-- نشستِ موبایل: مهلتِ کوتاهِ تکرارِ refresh با توکنِ قبلی (پاسخِ گم‌شده) — lib/mobileAuth.ts
-- AlterTable (DEFAULTِ ثابت → بدونِ بازنویسیِ جدول روی Postgres ≥ 11)
ALTER TABLE "Session" ADD COLUMN     "graceUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rotatedAt" TIMESTAMP(3);
