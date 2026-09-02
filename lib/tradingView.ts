// نگاشتِ نمادهای داخلی به نمادهای تریدینگ‌ویو.
//
// چرا لازم است: کدهای ما سبکِ بروکرند («XAUUSD»، «US30») ولی تریدینگ‌ویو
// نماد را با پیشوندِ صرافی/فیدر می‌خواهد («OANDA:XAUUSD»، «FX:EURUSD»).
// بدونِ این نگاشت، چارت روی نیمی از نمادها خالی می‌ماند.
//
// فیدرها عمداً همه رایگان و بدونِ نیاز به اشتراکِ تریدینگ‌ویو انتخاب شده‌اند.

import { TRADE_PAIRS } from "./tradePairs";

const EXPLICIT: Record<string, string> = {
  // فلزات و انرژی — OANDA و TVC پوششِ رایگانِ خوبی دارند
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

  // کریپتو — جفتِ اسپاتِ بایننس نقدشوندگیِ بیشتری دارد
  BTCUSD: "BINANCE:BTCUSDT",
  ETHUSD: "BINANCE:ETHUSDT",
  XRPUSD: "BINANCE:XRPUSDT",
  LTCUSD: "BINANCE:LTCUSDT",
  BNBUSD: "BINANCE:BNBUSDT",
  SOLUSD: "BINANCE:SOLUSDT",
  DOGEUSD: "BINANCE:DOGEUSDT",
  ADAUSD: "BINANCE:ADAUSDT",
};

/** کدِ داخلی → نمادِ تریدینگ‌ویو. پیش‌فرضِ فارکس `FX:` است. */
export function tradingViewSymbol(code: string): string {
  const c = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return EXPLICIT[c] || `FX:${c}`;
}

/** تایم‌فریم‌های چارت — مقدارِ سمتِ راست همان چیزی است که تریدینگ‌ویو می‌خواهد */
export const CHART_INTERVALS = [
  { label: "۱ دقیقه", short: "1m", tv: "1" },
  { label: "۵ دقیقه", short: "5m", tv: "5" },
  { label: "۱۵ دقیقه", short: "15m", tv: "15" },
  { label: "۱ ساعت", short: "1H", tv: "60" },
  { label: "۴ ساعت", short: "4H", tv: "240" },
  { label: "روزانه", short: "1D", tv: "D" },
] as const;

export type ChartInterval = (typeof CHART_INTERVALS)[number]["tv"];

export function isChartInterval(v: unknown): v is ChartInterval {
  return typeof v === "string" && CHART_INTERVALS.some((i) => i.tv === v);
}

export function pairLabel(code: string): string {
  return TRADE_PAIRS.find((p) => p.code === code)?.label || code;
}
