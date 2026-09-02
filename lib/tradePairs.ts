// کاتالوگ نمادهای رایج معاملاتی — برای پیشنهاد/جست‌وجو توی فیلد «جفت‌ارز»ی
// فرم ثبت معامله؛ برخلاف lib/tickerSymbols.ts (که نمادهای Yahoo Finance با
// پسوند =X/-USD هستن و برای گرفتن قیمت لحظه‌ای لازمن)، این‌جا همون کدهای
// خام سبک بروکر (EURUSD، XAUUSD، …) که تریدرها عادت دارن بنویسن.
export type TradePair = { code: string; label: string };

export const TRADE_PAIRS: TradePair[] = [
  // فارکس — میجرها
  { code: "EURUSD", label: "یورو / دلار" },
  { code: "GBPUSD", label: "پوند / دلار" },
  { code: "USDJPY", label: "دلار / ین" },
  { code: "USDCHF", label: "دلار / فرانک" },
  { code: "USDCAD", label: "دلار / دلار کانادا" },
  { code: "AUDUSD", label: "دلار استرالیا / دلار" },
  { code: "NZDUSD", label: "دلار نیوزیلند / دلار" },
  // فارکس — ماینورها
  { code: "EURGBP", label: "یورو / پوند" },
  { code: "EURJPY", label: "یورو / ین" },
  { code: "EURCHF", label: "یورو / فرانک" },
  { code: "EURAUD", label: "یورو / دلار استرالیا" },
  { code: "EURCAD", label: "یورو / دلار کانادا" },
  { code: "GBPJPY", label: "پوند / ین" },
  { code: "GBPCHF", label: "پوند / فرانک" },
  { code: "GBPAUD", label: "پوند / دلار استرالیا" },
  { code: "AUDJPY", label: "دلار استرالیا / ین" },
  { code: "AUDNZD", label: "دلار استرالیا / دلار نیوزیلند" },
  { code: "AUDCAD", label: "دلار استرالیا / دلار کانادا" },
  { code: "CADJPY", label: "دلار کانادا / ین" },
  { code: "CHFJPY", label: "فرانک / ین" },
  { code: "NZDJPY", label: "دلار نیوزیلند / ین" },
  // فارکس — اگزاتیک
  { code: "USDTRY", label: "دلار / لیر ترکیه" },
  { code: "USDZAR", label: "دلار / رند آفریقای جنوبی" },
  { code: "USDMXN", label: "دلار / پزو مکزیک" },
  { code: "USDSEK", label: "دلار / کرون سوئد" },
  { code: "USDNOK", label: "دلار / کرون نروژ" },
  { code: "USDCNH", label: "دلار / یوان چین" },
  // فلزات
  { code: "XAUUSD", label: "طلا / دلار" },
  { code: "XAGUSD", label: "نقره / دلار" },
  { code: "XPTUSD", label: "پلاتین / دلار" },
  { code: "XPDUSD", label: "پالادیوم / دلار" },
  // انرژی
  { code: "USOIL", label: "نفت خام WTI" },
  { code: "UKOIL", label: "نفت خام برنت" },
  { code: "NATGAS", label: "گاز طبیعی" },
  // شاخص‌ها (CFD)
  { code: "US30", label: "شاخص داوجونز" },
  { code: "US100", label: "شاخص نزدک ۱۰۰" },
  { code: "US500", label: "شاخص اس‌اند‌پی ۵۰۰" },
  { code: "GER40", label: "شاخص دکس آلمان" },
  { code: "UK100", label: "شاخص فوتسی انگلیس" },
  { code: "JPN225", label: "شاخص نیک‌کی ژاپن" },
  { code: "FRA40", label: "شاخص کک ۴۰ فرانسه" },
  // کریپتو
  { code: "BTCUSD", label: "بیت‌کوین / دلار" },
  { code: "ETHUSD", label: "اتریوم / دلار" },
  { code: "XRPUSD", label: "ریپل / دلار" },
  { code: "LTCUSD", label: "لایت‌کوین / دلار" },
  { code: "BNBUSD", label: "بایننس‌کوین / دلار" },
  { code: "SOLUSD", label: "سولانا / دلار" },
  { code: "DOGEUSD", label: "دوج‌کوین / دلار" },
  { code: "ADAUSD", label: "کاردانو / دلار" },
];

export function searchTradePairs(query: string, limit = 8): TradePair[] {
  const q = query.trim().toLowerCase();
  if (!q) return TRADE_PAIRS.slice(0, limit);
  return TRADE_PAIRS.filter(
    (p) => p.code.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)
  ).slice(0, limit);
}
