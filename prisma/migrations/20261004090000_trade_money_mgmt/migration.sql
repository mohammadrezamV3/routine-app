-- مدیریت سرمایه روی اکسپرت: قوانین هر حساب و لاگ اقدام‌های اکسپرت
ALTER TABLE "TradeMtLink" ADD COLUMN "moneyRules" JSONB;
ALTER TABLE "TradeMtLink" ADD COLUMN "mmLog" JSONB;
