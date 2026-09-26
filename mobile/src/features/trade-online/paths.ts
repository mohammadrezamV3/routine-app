// مسیرهای مطلقِ بخش‌های آنلاینِ ترید — TradeOnlineRoutes باید زیرِ
// `/trade/online/*` سوار بشه (Routesِ داخلی‌اش نسبی‌ان).
export const tradeOnlineRoutePaths = {
  calendar: "/trade/online/calendar",
  market: "/trade/online/market",
  metatrader: "/trade/online/metatrader",
  metatraderAccount: (accountId: string) => `/trade/online/metatrader/${encodeURIComponent(accountId)}`,
} as const;
