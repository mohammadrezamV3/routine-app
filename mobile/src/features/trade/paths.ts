// مسیرهای مطلقِ ماژولِ ترید — فایلِ جدا از index.tsx تا صفحه‌ها (که خودشون
// از index import می‌شن) وابستگیِ چرخه‌ای نسازن (TDZ: «Cannot read properties
// of undefined» هنگامِ لود).
export const tradeRoutePaths = {
  hub: "/trade",
  account: (id: string) => `/trade/accounts/${id}`,
  checklists: "/trade/checklists",
  calendar: "/trade/calendar",
  clock: "/trade/clock",
  notes: "/trade/notes",
};
