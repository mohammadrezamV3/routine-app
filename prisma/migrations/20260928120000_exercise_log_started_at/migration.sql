-- «شروع تمرین» برای هر روز ثبت می‌شود تا حالتِ «ماندن» برنامه‌ی تمرینی
-- (lib/exerciseProgression.ts) بداند کدام روز واقعاً گذرانده شده.
-- backfill لازم نیست: لاگِ قدیمیِ دارای پیشرفت (completed/completedItems) سمتِ کلاینت «شروع‌شده» حساب می‌شود.

ALTER TABLE "ExerciseLog" ADD COLUMN "startedAt" TIMESTAMP(3);
