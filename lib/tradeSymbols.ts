// اندازه‌ی قراردادِ نمادها — فقط و فقط برای **پیشنهادِ** محاسبه‌ی سود/زیان و
// ریسک در فرمِ ثبتِ معامله.
//
// چرا این فایل لازم شد: فرمولِ قبلیِ ژورنال `(خروج − ورود) × لات` بود که
// contract size را ۱ فرض می‌کرد. برای EURUSD (هر لات = ۱۰۰٬۰۰۰ واحد) و
// XAUUSD (هر لات = ۱۰۰ اونس) این عدد ده‌ها هزار برابر غلط درمی‌آمد.
//
// نکته‌ی مهمِ محصولی: هیچ‌کدام از این اعداد «حقیقتِ نهایی» نیستند — هر بروکر
// اندازه‌ی قراردادِ کمی متفاوت دارد. برای همین این‌ها فقط یک عددِ پیشنهادی
// می‌سازند که کاربر می‌تواند بازنویسی‌اش کند؛ چیزی که ذخیره می‌شود همان
// عددِ تأییدشده‌ی کاربر است، نه خروجیِ این جدول.

import { TRADE_PAIRS, TradePair } from "./tradePairs";

export type SymbolKind = "FOREX" | "METAL" | "ENERGY" | "INDEX" | "CRYPTO";

/** واحد در هر «لاتِ استاندارد» */
const CONTRACT_SIZE: Record<string, number> = {
  // فارکس — لاتِ استاندارد ۱۰۰٬۰۰۰ واحدِ ارزِ پایه
  __FOREX_DEFAULT__: 100_000,
  // فلزات
  XAUUSD: 100, XAGUSD: 5_000, XPTUSD: 100, XPDUSD: 100,
  // انرژی
  USOIL: 1_000, UKOIL: 1_000, NATGAS: 10_000,
  // شاخص‌ها و کریپتو — معمولاً «۱ واحد به‌ازای هر لات»
  __INDEX_DEFAULT__: 1,
  __CRYPTO_DEFAULT__: 1,
};

export function symbolKind(code: string): SymbolKind {
  const c = code.toUpperCase();
  if (["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"].includes(c)) return "METAL";
  if (["USOIL", "UKOIL", "NATGAS"].includes(c)) return "ENERGY";
  if (["US30", "US100", "US500", "GER40", "UK100", "JPN225", "FRA40"].includes(c)) return "INDEX";
  if (/^(BTC|ETH|XRP|LTC|BNB|SOL|DOGE|ADA)/.test(c)) return "CRYPTO";
  return "FOREX";
}

/** اندازه‌ی قرارداد؛ برای نمادِ ناشناخته ۱ برمی‌گردد (یعنی «همان عددی که وارد کردی») */
export function contractSize(code: string): number {
  const c = code.toUpperCase();
  if (CONTRACT_SIZE[c]) return CONTRACT_SIZE[c];
  const kind = symbolKind(c);
  if (kind === "FOREX") return CONTRACT_SIZE.__FOREX_DEFAULT__;
  if (kind === "INDEX") return CONTRACT_SIZE.__INDEX_DEFAULT__;
  if (kind === "CRYPTO") return CONTRACT_SIZE.__CRYPTO_DEFAULT__;
  return 1;
}

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/**
 * پیشنهادِ سود/زیان به ارزِ حساب.
 * فقط وقتی عدد می‌دهد که هر سه‌ی ورود/خروج/حجم موجود باشند — وگرنه null،
 * چون «صفر» با «نمی‌دانم» یکی نیست و کاربرِ ژورنال باید تفاوتش را ببیند.
 * کمیسیون و سواپ (اگر وارد شده باشند) از همین پیشنهاد کم می‌شوند تا عددِ
 * پیشنهادی همان چیزی باشد که کاربر در صورت‌حسابِ بروکر می‌بیند.
 */
export function suggestPnl(opts: {
  symbol: string;
  direction: "BUY" | "SELL";
  entryPrice: number | null;
  exitPrice: number | null;
  volume: number | null;
  volumeUnit?: "LOT" | "USD";
  commission?: number | null;
  swap?: number | null;
}): number | null {
  const { symbol, direction, entryPrice, exitPrice, volume } = opts;
  if (!entryPrice || !exitPrice || !volume) return null;
  const diff = direction === "BUY" ? exitPrice - entryPrice : entryPrice - exitPrice;
  // حجم بر حسب دلار یعنی کاربر خودش ارزشِ اسمی را داده، پس فقط درصدِ حرکت
  const gross =
    opts.volumeUnit === "USD"
      ? (diff / entryPrice) * volume
      : diff * volume * contractSize(symbol);
  // کمیسیون همیشه هزینه است (پس علامتش را نادیده می‌گیریم و کم می‌کنیم)، ولی
  // سواپ می‌تواند مثبت هم باشد — پس با علامتِ خودش جمع می‌شود.
  const net = gross - Math.abs(opts.commission || 0) + (opts.swap || 0);
  return round2(net);
}

/** ریسکِ اولیه به ارزِ حساب — مخرجِ R؛ از فاصله‌ی ورود تا حدضرر */
export function suggestRiskAmount(opts: {
  symbol: string;
  entryPrice: number | null;
  stopLoss: number | null;
  volume: number | null;
  volumeUnit?: "LOT" | "USD";
}): number | null {
  const { symbol, entryPrice, stopLoss, volume } = opts;
  if (!entryPrice || !stopLoss || !volume) return null;
  const dist = Math.abs(entryPrice - stopLoss);
  if (dist <= 0) return null;
  const risk =
    opts.volumeUnit === "USD"
      ? (dist / entryPrice) * volume
      : dist * volume * contractSize(symbol);
  return round2(risk);
}

/**
 * R = سود/زیانِ خالص ÷ ریسکِ اولیه.
 * اگر ریسکِ اولیه معلوم نباشد null برمی‌گردد — عمداً صفر نمی‌دهیم، چون
 * «معامله‌ای که R نداشت» نباید میانگینِ R را به سمتِ صفر بکشد.
 */
export function computeR(pnl: number | null, riskAmount: number | null): number | null {
  if (pnl === null || !riskAmount || riskAmount <= 0) return null;
  return Math.round((pnl / riskAmount) * 100) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function searchSymbols(query: string, limit = 8): TradePair[] {
  const q = query.trim().toLowerCase();
  if (!q) return TRADE_PAIRS.slice(0, limit);
  return TRADE_PAIRS.filter(
    (p) => p.code.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)
  ).slice(0, limit);
}
