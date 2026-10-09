// کاتالوگ نمادهای رایج معاملاتی — برای پیشنهاد/جست‌وجو توی فیلد «جفت‌ارز»ی
// فرم ثبت معامله؛ برخلاف lib/tickerSymbols.ts (که نمادهای Yahoo Finance با
// پسوند =X/-USD هستن و برای گرفتن قیمت لحظه‌ای لازمن)، این‌جا همون کدهای
// خام سبک بروکر (EURUSD، XAUUSD، …) که تریدرها عادت دارن بنویسن.
import { tr } from "./i18n";

export type TradePair = { code: string; label: string };

// label با getter حل می‌شه تا زبان جاری موقع خوندن اعمال بشه (نه موقع import).
function pair(code: string, fa: string, en: string): TradePair {
  return { code, get label() { return tr(fa, en); } };
}

export const TRADE_PAIRS: TradePair[] = [
  // فارکس — میجرها
  pair("EURUSD", "یورو / دلار", "EUR / USD"),
  pair("GBPUSD", "پوند / دلار", "GBP / USD"),
  pair("USDJPY", "دلار / ین", "USD / JPY"),
  pair("USDCHF", "دلار / فرانک", "USD / CHF"),
  pair("USDCAD", "دلار / دلار کانادا", "USD / CAD"),
  pair("AUDUSD", "دلار استرالیا / دلار", "AUD / USD"),
  pair("NZDUSD", "دلار نیوزیلند / دلار", "NZD / USD"),
  // فارکس — ماینورها
  pair("EURGBP", "یورو / پوند", "EUR / GBP"),
  pair("EURJPY", "یورو / ین", "EUR / JPY"),
  pair("EURCHF", "یورو / فرانک", "EUR / CHF"),
  pair("EURAUD", "یورو / دلار استرالیا", "EUR / AUD"),
  pair("EURCAD", "یورو / دلار کانادا", "EUR / CAD"),
  pair("GBPJPY", "پوند / ین", "GBP / JPY"),
  pair("GBPCHF", "پوند / فرانک", "GBP / CHF"),
  pair("GBPAUD", "پوند / دلار استرالیا", "GBP / AUD"),
  pair("AUDJPY", "دلار استرالیا / ین", "AUD / JPY"),
  pair("AUDNZD", "دلار استرالیا / دلار نیوزیلند", "AUD / NZD"),
  pair("AUDCAD", "دلار استرالیا / دلار کانادا", "AUD / CAD"),
  pair("CADJPY", "دلار کانادا / ین", "CAD / JPY"),
  pair("CHFJPY", "فرانک / ین", "CHF / JPY"),
  pair("NZDJPY", "دلار نیوزیلند / ین", "NZD / JPY"),
  // فارکس — اگزاتیک
  pair("USDTRY", "دلار / لیر ترکیه", "USD / Turkish lira"),
  pair("USDZAR", "دلار / رند آفریقای جنوبی", "USD / South African rand"),
  pair("USDMXN", "دلار / پزو مکزیک", "USD / Mexican peso"),
  pair("USDSEK", "دلار / کرون سوئد", "USD / Swedish krona"),
  pair("USDNOK", "دلار / کرون نروژ", "USD / Norwegian krone"),
  pair("USDCNH", "دلار / یوان چین", "USD / Chinese yuan"),
  // فلزات
  pair("XAUUSD", "طلا / دلار", "Gold / USD"),
  pair("XAGUSD", "نقره / دلار", "Silver / USD"),
  pair("XPTUSD", "پلاتین / دلار", "Platinum / USD"),
  pair("XPDUSD", "پالادیوم / دلار", "Palladium / USD"),
  // انرژی
  pair("USOIL", "نفت خام WTI", "WTI crude oil"),
  pair("UKOIL", "نفت خام برنت", "Brent crude oil"),
  pair("NATGAS", "گاز طبیعی", "Natural gas"),
  // شاخص‌ها (CFD)
  pair("US30", "شاخص داوجونز", "Dow Jones index"),
  pair("US100", "شاخص نزدک 100", "Nasdaq 100 index"),
  pair("US500", "شاخص اس‌اند‌پی 500", "S&P 500 index"),
  pair("GER40", "شاخص دکس آلمان", "DAX index (Germany)"),
  pair("UK100", "شاخص فوتسی انگلیس", "FTSE index (UK)"),
  pair("JPN225", "شاخص نیک‌کی ژاپن", "Nikkei index (Japan)"),
  pair("FRA40", "شاخص کک 40 فرانسه", "CAC 40 index (France)"),
  // کریپتو
  pair("BTCUSD", "بیت‌کوین / دلار", "Bitcoin / USD"),
  pair("ETHUSD", "اتریوم / دلار", "Ethereum / USD"),
  pair("XRPUSD", "ریپل / دلار", "Ripple / USD"),
  pair("LTCUSD", "لایت‌کوین / دلار", "Litecoin / USD"),
  pair("BNBUSD", "بایننس‌کوین / دلار", "BNB / USD"),
  pair("SOLUSD", "سولانا / دلار", "Solana / USD"),
  pair("DOGEUSD", "دوج‌کوین / دلار", "Dogecoin / USD"),
  pair("ADAUSD", "کاردانو / دلار", "Cardano / USD"),
];

export function searchTradePairs(query: string, limit = 8): TradePair[] {
  const q = query.trim().toLowerCase();
  if (!q) return TRADE_PAIRS.slice(0, limit);
  return TRADE_PAIRS.filter(
    (p) => p.code.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)
  ).slice(0, limit);
}
