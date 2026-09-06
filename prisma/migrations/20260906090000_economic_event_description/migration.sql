-- بخش «دیتیل» تقویم اقتصادی — فقط ورودِ دستیِ ادمین، فیدِ بیرونی همچین
-- فیلدی نمی‌دهد؛ nullable می‌ماند و کلاینت برای خالی‌بودنش متنِ جایگزین نشان می‌دهد.
-- AlterTable
ALTER TABLE "EconomicEvent" ADD COLUMN "description" TEXT;
