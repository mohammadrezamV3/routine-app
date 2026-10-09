// نگاشت نمادهای داخلی به نمادهای تریدینگ‌ویو.
//
// چرا لازم است: کدهای ما سبک بروکرند («XAUUSD»، «US30») ولی تریدینگ‌ویو
// نماد را با پیشوند صرافی/فیدر می‌خواهد («OANDA:XAUUSD»، «FX:EURUSD»).
// بدون این نگاشت، چارت روی نیمی از نمادها خالی می‌ماند.
//
// فیدرها عمدا همه رایگان و بدون نیاز به اشتراک تریدینگ‌ویو انتخاب شده‌اند.

import { TRADE_PAIRS } from "./tradePairs";
import { tr } from "./i18n";

const EXPLICIT: Record<string, string> = {
  // فلزات و انرژی — OANDA و TVC پوشش رایگان خوبی دارند
  XAUUSD: "OANDA:XAUUSD",
  XAGUSD: "OANDA:XAGUSD",
  XPTUSD: "OANDA:XPTUSD",
  XPDUSD: "OANDA:XPDUSD",
  USOIL: "TVC:USOIL",
  UKOIL: "TVC:UKOIL",
  NATGAS: "TVC:NATGAS",

  // شاخص‌ها
  US30: "TVC:DJI",
  US100: "TVC:NDX",
  US500: "TVC:SPX",
  GER40: "TVC:DAX",
  UK100: "TVC:UKX",
  JPN225: "TVC:NI225",
  FRA40: "TVC:CAC40",

  // کریپتو — جفت اسپات بایننس نقدشوندگی بیشتری دارد
  BTCUSD: "BINANCE:BTCUSDT",
  ETHUSD: "BINANCE:ETHUSDT",
  XRPUSD: "BINANCE:XRPUSDT",
  LTCUSD: "BINANCE:LTCUSDT",
  BNBUSD: "BINANCE:BNBUSDT",
  SOLUSD: "BINANCE:SOLUSDT",
  DOGEUSD: "BINANCE:DOGEUSDT",
  ADAUSD: "BINANCE:ADAUSDT",
};

/** کد داخلی → نماد تریدینگ‌ویو. پیش‌فرض فارکس `FX:` است. */
export function tradingViewSymbol(code: string): string {
  const c = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return EXPLICIT[c] || `FX:${c}`;
}

/** تایم‌فریم‌های چارت — مقدار سمت راست همان چیزی است که تریدینگ‌ویو می‌خواهد */
function iv<T extends string>(fa: string, en: string, short: string, tv: T) {
  return { get label(): string { return tr(fa, en); }, short, tv };
}

export const CHART_INTERVALS = [
  iv("1 دقیقه", "1 minute", "1m", "1"),
  iv("5 دقیقه", "5 minutes", "5m", "5"),
  iv("15 دقیقه", "15 minutes", "15m", "15"),
  iv("1 ساعت", "1 hour", "1H", "60"),
  iv("4 ساعت", "4 hours", "4H", "240"),
  iv("روزانه", "Daily", "1D", "D"),
] as const;

export type ChartInterval = (typeof CHART_INTERVALS)[number]["tv"];

export function isChartInterval(v: unknown): v is ChartInterval {
  return typeof v === "string" && CHART_INTERVALS.some((i) => i.tv === v);
}

export function pairLabel(code: string): string {
  return TRADE_PAIRS.find((p) => p.code === code)?.label || code;
}
