// قراردادِ API بخش‌های «آنلاینِ» ماژولِ ترید بینِ بک‌اندِ وب و اپ اندروید —
// /api/mobile/trade-online/*
//
// این فایل عمدا هیچ import‌ای نداره تا عینا بشه کپی‌اش رو توی
// `mobile/src/lib/trade-online-contract.ts` گذاشت. نسخه‌ی مرجع همین‌جاست؛
// تستِ __tests__/mobileTradeOnlineContract.test.ts اگه دو نسخه از هم فاصله
// بگیرن (یا ثابت‌های این‌جا با lib/economicCalendar.ts / lib/tickerSymbols.ts
// ناهمخوان بشن) می‌شکنه.
//
// قواعدِ کلی:
//   • احرازِ هویت فقط با `Authorization: Bearer <accessToken>` (lib/mobileAuth.ts).
//   • همه‌ی endpointها پشتِ ماژولِ TRADE‌ان (همون تصمیمِ requireModule وب)؛
//     بدونِ دسترسی → 403 با `{ error: "module_locked" }`.
//   • این‌ها «همگام‌سازی» نیستن — داده‌ی زنده‌ی سرورن و فقط با اینترنت کار
//     می‌کنن. اپ برای نمایشِ آفلاین آخرین پاسخ‌ها رو کش می‌کنه.
//   • تقویمِ اقتصادی همیشه از جدولِ خودمون (EconomicEvent) خونده می‌شه، نه
//     مستقیم از سرویسِ بیرونی.
//   • متاتریدر: رمزِ حسابِ معاملاتی هیچ‌وقت خواسته/ذخیره نمی‌شه. کدِ اتصال
//     فقط یک‌بار (در پاسخِ ساختِ کد) برمی‌گرده؛ سرور فقط SHA-256ش رو نگه
//     می‌داره. اتصال روی خودِ حسابه، نه کاربر.

export const TRADE_ONLINE_ERROR_MODULE_LOCKED = "module_locked";

// ─── تقویمِ اقتصادی ─────────────────────────────────────────────────────

export type EconomicImpact = "LOW" | "MEDIUM" | "HIGH";

export const ECON_IMPACT_ORDER: EconomicImpact[] = ["HIGH", "MEDIUM", "LOW"];

export const ECON_IMPACT_LABELS: Record<EconomicImpact, string> = {
  HIGH: "تأثیر بالا",
  MEDIUM: "تأثیر متوسط",
  LOW: "تأثیر کم",
};

export const ECON_IMPACT_COLORS: Record<EconomicImpact, string> = {
  HIGH: "#E05252",
  MEDIUM: "#E0A452",
  LOW: "#8A9099",
};

/** ارزهای چیپِ فیلتر — آینه‌ی CALENDAR_CURRENCIES در lib/economicCalendar.ts */
export const ECON_CALENDAR_CURRENCIES: { code: string; country: string; flag: string; label: string }[] = [
  { code: "USD", country: "US", flag: "🇺🇸", label: "دلار آمریکا" },
  { code: "EUR", country: "EU", flag: "🇪🇺", label: "یورو" },
  { code: "GBP", country: "GB", flag: "🇬🇧", label: "پوند" },
  { code: "JPY", country: "JP", flag: "🇯🇵", label: "ین ژاپن" },
  { code: "CHF", country: "CH", flag: "🇨🇭", label: "فرانک سوئیس" },
  { code: "CAD", country: "CA", flag: "🇨🇦", label: "دلار کانادا" },
  { code: "AUD", country: "AU", flag: "🇦🇺", label: "دلار استرالیا" },
  { code: "NZD", country: "NZ", flag: "🇳🇿", label: "دلار نیوزیلند" },
  { code: "CNY", country: "CN", flag: "🇨🇳", label: "یوان چین" },
];

/** سقفِ طولِ بازه‌ی یک درخواستِ تقویم (روز) — همون سقفِ روتِ وب */
export const ECON_CALENDAR_MAX_RANGE_DAYS = 180;
/** سقفِ تعدادِ رویداد در یک پاسخ — همون روتِ وب */
export const ECON_CALENDAR_MAX_EVENTS = 500;

/**
 * GET /api/mobile/trade-online/calendar
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD   (اجباری؛ «روزِ محلیِ» کاربر)
 *   &tz=<دقیقه، شرقِ UTC مثبت؛ ایران 210>
 *   &currencies=USD,EUR   &other=1 (هر ارزی بیرونِ فهرستِ بالا)
 *   &impacts=HIGH,MEDIUM  &q=<جستجوی عنوان، حداکثر ۱۲۰>
 */
export type EconomicEventDto = {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: EconomicImpact;
  /** UTC ISO */
  occursAt: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  description: string | null;
  source: string;
};

export type EconomicCalendarResponse = {
  events: EconomicEventDto[];
  /** بازه‌ای که واقعاً در جدول داده داریم (نه حدس) — null وقتی جدول خالیه */
  range: { from: string | null; to: string | null };
};

// ─── قیمتِ بازار / واچ‌لیست ─────────────────────────────────────────────

export type TickerCategory = "index" | "forex" | "commodity" | "crypto" | "stock";
export type TickerSymbolDto = { symbol: string; label: string; category: TickerCategory };

export const TICKER_CATEGORY_LABELS: Record<TickerCategory, string> = {
  forex: "فارکس",
  commodity: "کالا",
  index: "شاخص",
  crypto: "کریپتو",
  stock: "سهام",
};

/** همون مقادیرِ lib/tickerSymbols.ts (نوارِ قیمتِ وب) */
export const TICKER_DEFAULT_SYMBOLS = ["GC=F", "EURUSD=X", "GBPUSD=X", "BTC-USD", "ETH-USD"];
export const TICKER_MAX_SYMBOLS = 20;
export const TICKER_MIN_SYMBOLS = 1;
/** سقفِ نماد در هر درخواستِ قیمت — بیشتر رو کلاینت تکه‌تکه می‌فرسته */
export const MARKET_MAX_SYMBOLS_PER_REQUEST = 10;
/** قیمت‌ها سمتِ سرور ۳۰ ثانیه کش می‌شن؛ تازه‌سازیِ سریع‌تر بی‌فایده‌ست */
export const MARKET_POLL_MS = 30_000;

export type MarketQuote = { symbol: string; price: number; changePercent: number; changeAbs: number };

/** GET /api/mobile/trade-online/market/prices?symbols=GC=F,EURUSD=X — نمادِ ناموفق/نامعتبر فقط حذف می‌شه */
export type MarketPricesResponse = { quotes: MarketQuote[] };

/**
 * GET  /api/mobile/trade-online/market/watchlist → همین شکل
 * POST /api/mobile/trade-online/market/watchlist { symbols } → همین شکل
 * همون تنظیمِ «tradeTickerSymbols»ِ نوارِ قیمتِ وب — یعنی واچ‌لیستِ گوشی و
 * نوارِ وب یکی‌ان. نمادها باید از catalog باشن (۱ تا ۲۰ تا).
 */
export type MarketWatchlistResponse = {
  symbols: string[];
  /** آیا کاربر خودش انتخاب کرده (false = پیش‌فرض) */
  saved: boolean;
  catalog: TickerSymbolDto[];
};

export type MarketWatchlistRequest = { symbols: string[] };

// ─── متاتریدر ────────────────────────────────────────────────────────────

export type MtPlatform = "MT4" | "MT5";

export type MtLinkDto = {
  id: string;
  platform: MtPlatform;
  brokerName: string | null;
  serverName: string | null;
  accountLogin: string | null;
  balance: number | null;
  equity: number | null;
  currency: string | null;
  tokenPrefix: string | null;
  /** توکنِ EA هست و باطل نشده */
  connected: boolean;
  connectedAt: string | null;
  lastSyncAt: string | null;
  revokedAt: string | null;
  pairingExpiresAt: string | null;
};

export type MtAccountStatus = {
  accountId: string;
  name: string;
  type: "REAL" | "DEMO" | "PROP" | "BACKTEST";
  color: string;
  archived: boolean;
  link: MtLinkDto | null;
};

/** GET /api/mobile/trade-online/metatrader — همه‌ی حساب‌های آرشیونشده + وضعیتِ اتصال */
export type MtAccountsResponse = { accounts: MtAccountStatus[] };

/** GET /api/mobile/trade-online/metatrader?accountId=… — یک حساب (آرشیوشده هم) */
export type MtLinkResponse = { link: MtLinkDto | null };

/** POST /api/mobile/trade-online/metatrader/code */
export type MtCodeRequest = { accountId: string; platform: MtPlatform };
/** `code` فقط همین یک‌بار برمی‌گرده — جایی ذخیره‌اش نکن */
export type MtCodeResponse = { ok: true; code: string; expiresAt: string; link: MtLinkDto };

/** POST /api/mobile/trade-online/metatrader/revoke — معاملاتِ همگام‌شده دست نمی‌خورن */
export type MtRevokeRequest = { accountId: string };
export type MtRevokeResponse = { ok: true };

/** فایلِ اکسپرت برای دانلود (مسیرِ نسبی روی همون سرور) */
export const MT_EA_FILES: Record<MtPlatform, { path: string; name: string; mqlFolder: string }> = {
  MT4: { path: "/ea/Arion-MT4.mq4", name: "Arion-MT4.mq4", mqlFolder: "MQL4" },
  MT5: { path: "/ea/Arion-MT5.mq5", name: "Arion-MT5.mq5", mqlFolder: "MQL5" },
};
