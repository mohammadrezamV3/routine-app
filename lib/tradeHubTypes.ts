// قرارداد پاسخ GET /api/trade/hub — مشترک روت (سرور) و هاب ترید (کلاینت).
// هیچ import سروری این‌جا نیست.
//
// قاعده‌ی کلی (مثل lib/dashboardTypes.ts): هر بخشی که برای این کاربر خاموشه
// (فلگ پنل ادمین) یا ساختنش خطا داد `null` برمی‌گرده، نه خطا — تا بقیه‌ی هاب
// سالم بمونه. خطاها اسمشون توی `errors` میاد.

import type { DashEvent, DashTrade } from "./dashboardTypes";

export type HubEvent = Pick<DashEvent, "id" | "title" | "currency" | "impact" | "occursAt">;

export type HubAccount = {
  id: string;
  name: string;
  color: string;
  currency: string;
  balance: number;
  /** رشد حساب نسبت به سرمایه‌ی شروع به درصد؛ null اگه پایه معلوم نیست */
  growthPct: number | null;
};

export type HubKpi = {
  /** ارزی که سود/زیان امروز با اون حساب شده (ارز بیشترین حساب‌ها) */
  currency: string;
  /** حساب‌های فعال کاربر؛ صفر یعنی هنوز حسابی نساخته */
  accountCount: number;
  today: DashTrade["today"];
  /** وین‌ریت 30 روز اخیر به درصد (0..100) */
  winRate: number | null;
  profitFactor: number | null;
  closed30: number;
  openTrades: number;
  /** نماد معامله‌های باز (حداکثر 3، یکتا) */
  openSymbols: string[];
};

export type HubChecklists = {
  count: number;
  /** چک‌لیست شاخص: آخرین استفاده‌شده، وگرنه اولین فعال */
  featured: { id: string; name: string; checked: number; total: number } | null;
  lastUsedAt: string | null;
};

export type HubNote = { id: string; title: string; excerpt: string; updatedAt: string };

export type TradeHubData = {
  generatedAt: string;
  /** سود/زیان و وین‌ریت (نیازمند فلگ tradeJournal) */
  kpi: HubKpi | null;
  accounts: { items: HubAccount[]; total: number } | null;
  /** خبر مهم (HIGH) بعدی برای شمارش معکوس (فلگ economicCalendar) */
  nextNews: HubEvent | null;
  /** سه رویداد مهم (HIGH/MEDIUM) پیش‌رو؛ null = تقویم برای این کاربر خاموشه */
  calendar: { events: HubEvent[] } | null;
  chart: { lastSymbol: string | null; recentSymbols: string[] } | null;
  checklists: HubChecklists | null;
  notes: { count: number; latest: HubNote | null } | null;
  metatrader: { connected: number; lastSyncAt: string | null } | null;
  /** اسم بخش‌هایی که دسترسی داشتن ولی ساختشون خطا داد */
  errors: string[];
};
