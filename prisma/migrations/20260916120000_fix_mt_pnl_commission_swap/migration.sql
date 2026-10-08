-- قبلا pnlِ معاملاتِ همگام‌شده از متاتریدر برابرِ سودِ خامِ قیمتی بود
-- (OrderProfit در MT4، DEAL_PROFIT در MT5) — طبقِ خودِ داکیومنتِ متاتریدر این
-- دو تابع کمیسیون و سواپ رو شامل نمی‌شن، درحالی‌که قراردادِ این جدوله که
-- pnl باید خالص و نهایی باشه (کمیسیون/سواپ فقط اطلاعاتی‌ان، نه اینکه دوباره
-- ازش کم بشن). این یک‌بار، برای معاملاتِ بسته‌ای که قبل از فیکسِ
-- app/api/mt/sync اصلاح شدن، اصلاح می‌شه؛ از این به بعد خودِ route درست
-- محاسبه می‌کنه.
UPDATE "TradeEntry"
SET "pnl" = "pnl" + COALESCE("commission", 0) + COALESCE("swap", 0),
    "result" = (CASE
                  WHEN "pnl" + COALESCE("commission", 0) + COALESCE("swap", 0) > 0 THEN 'PROFIT'
                  WHEN "pnl" + COALESCE("commission", 0) + COALESCE("swap", 0) < 0 THEN 'LOSS'
                  ELSE 'BREAKEVEN'
                END)::"TradeResult",
    "rMultiple" = (CASE
                     WHEN "riskAmount" IS NOT NULL AND "riskAmount" > 0 THEN
                       ROUND((("pnl" + COALESCE("commission", 0) + COALESCE("swap", 0)) / "riskAmount") * 100) / 100
                     ELSE "rMultiple"
                   END)
WHERE "externalSource" IN ('MT4', 'MT5')
  AND "status" = 'CLOSED'
  AND (COALESCE("commission", 0) != 0 OR COALESCE("swap", 0) != 0);
