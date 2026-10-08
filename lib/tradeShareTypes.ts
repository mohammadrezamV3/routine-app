// قرارداد مشترک «اشتراک کارنامه‌ی ترید» — بین سه بخش:
//   1. سرور: GET /api/trade/share (app/api/trade/share/route.ts) + محاسبه‌ی خالص lib/tradeShare.ts
//   2. تصویر: renderTradeShareCard در lib/tradeShareCard.ts (canvas، هم‌سبک lib/shareCard.ts)
//   3. رابط: components/TradeSharePanel.tsx (انتخاب بازه و حساب، پیش‌نمایش، دکمه‌ی اشتراک)
// هر تغییری در این شکل باید هر سه رو با هم عوض کنه.

/** بازه‌ی کارنامه: یک روز، یک هفته (شنبه تا جمعه) یا یک ماه شمسی */
export type TradeSharePeriod = "day" | "week" | "month";

export const TRADE_SHARE_PERIODS: readonly TradeSharePeriod[] = ["day", "week", "month"] as const;

/** «all» = همه‌ی حساب‌های فعال (آرشیوشده‌ها نه) */
export type TradeShareAccountParam = string | "all";

/**
 * پارامترهای درخواست: /api/trade/share?period=day|week|month&date=YYYY-MM-DD&account=<id>|all
 * date یک روز میلادی به وقت ایران (Asia/Tehran) داخل بازه‌ست؛ سرور بازه رو از روی
 * اون می‌سازه (هفته از شنبه، ماه = ماه شمسی همون روز). پیش‌فرض: امروز.
 */
export type TradeShareQuery = { period: TradeSharePeriod; date: string; account: TradeShareAccountParam };

export type TradeShareAccount = { id: string; name: string; color: string; currency: string };

export type TradeShareStats = {
  /** فقط معاملات CLOSED داخل بازه (بر اساس openedAt)، همون تعریف lib/tradeAnalytics.ts */
  trades: number;
  wins: number;
  losses: number;
  breakEven: number;
  /** 0 تا 100، یا null وقتی معامله‌ی بسته‌ای نیست */
  winRate: number | null;
  /** خالص سود/زیان به ارز حساب؛ وقتی currencyMixed هست null (جمع ارزهای مختلف بی‌معناست) */
  netPnl: number | null;
  /** درصد بازده نسبت به موجودی ابتدای بازه (initialBalance + سود/زیان قبل از بازه)؛ null اگه قابل محاسبه نیست */
  returnPct: number | null;
  profitFactor: number | null;
  avgR: number | null;
  /** بزرگ‌ترین سود و بزرگ‌ترین ضرر یک معامله (null اگه نبوده یا currencyMixed) */
  bestTrade: number | null;
  worstTrade: number | null;
};

export type TradeShareData = {
  period: TradeSharePeriod;
  /** شروع (شامل) و پایان (غیرشامل) بازه، ISO  UTC */
  startIso: string;
  endIso: string;
  /** برچسب فارسی آماده‌ی نمایش، ارقام لاتین، بدون اعراب: «پنجشنبه 10 مهر 1405» / «هفته‌ی 5 تا 11 مهر 1405» / «مهر 1405» */
  rangeLabel: string;
  /** null یعنی «همه‌ی حساب‌ها» */
  account: TradeShareAccount | null;
  /** تعداد حساب‌هایی که در این کارنامه حساب شدن */
  accountCount: number;
  /** ارز مشترک وقتی همه یکی‌ان؛ وقتی ارزها فرق دارن null و currencyMixed=true */
  currency: string | null;
  currencyMixed: boolean;
  stats: TradeShareStats;
  /**
   * منحنی تجمعی سود/زیان داخل بازه، شروع از 0. برای «روز» هر نقطه بعد از هر معامله،
   * برای هفته/ماه هر نقطه پایان هر روز بازه (روزهای بی‌معامله همون مقدار قبل). وقتی
   * currencyMixed هست بر اساس درصد بازده‌ی هر معامله نیست، پس خالی [] برمی‌گرده.
   */
  curve: number[];
  /** پرمعامله‌ترین نمادهای بازه، حداکثر 3، به ترتیب تعداد */
  topSymbols: { symbol: string; count: number; netPnl: number | null }[];
};

/** پاسخ API: داده + فهرست حساب‌های قابل انتخاب برای انتخابگر رابط */
export type TradeShareResponse = {
  data: TradeShareData;
  accounts: TradeShareAccount[];
};
