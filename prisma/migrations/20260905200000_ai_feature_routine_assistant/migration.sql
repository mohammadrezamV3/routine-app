-- دستیارِ «مدیرِ برنامه» روی صفحه‌ی روتین.
-- شمارشِ ردیف‌های AiUsageRecord با همین مقدار است که سهمیه‌ی سه‌بارِ رایگانِ
-- کاربرِ بدونِ اشتراک را می‌سنجد.
ALTER TYPE "AiFeatureKey" ADD VALUE IF NOT EXISTS 'ROUTINE_ASSISTANT';
