-- ایندکس‌های سرعت: شمارش معاملات باز هر کاربر (داشبورد) و پلن فعال تمرین (هر درخواست بدنسازی)
CREATE INDEX IF NOT EXISTS "TradeEntry_userId_status_idx" ON "TradeEntry"("userId", "status");
CREATE INDEX IF NOT EXISTS "ExercisePlan_userId_isActive_startDate_idx" ON "ExercisePlan"("userId", "isActive", "startDate");
