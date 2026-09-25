// زیرمجموعه‌ی پرکاربردِ lib/tradePairs.ts (وب) — برای فیلد نمادِ فرم ثبت
// معامله در موبایل؛ کاربر همچنان می‌تواند هر متن دلخواهی هم تایپ کند.
export type TradePair = { code: string; label: string };

export const TRADE_PAIRS: TradePair[] = [
  { code: "EURUSD", label: "یورو / دلار" },
  { code: "GBPUSD", label: "پوند / دلار" },
  { code: "USDJPY", label: "دلار / ین" },
  { code: "USDCHF", label: "دلار / فرانک" },
  { code: "USDCAD", label: "دلار / دلار کانادا" },
  { code: "AUDUSD", label: "دلار استرالیا / دلار" },
  { code: "NZDUSD", label: "دلار نیوزیلند / دلار" },
  { code: "EURGBP", label: "یورو / پوند" },
  { code: "EURJPY", label: "یورو / ین" },
  { code: "GBPJPY", label: "پوند / ین" },
  { code: "XAUUSD", label: "طلا / دلار" },
  { code: "XAGUSD", label: "نقره / دلار" },
  { code: "USOIL", label: "نفت آمریکا" },
  { code: "UKOIL", label: "نفت برنت" },
  { code: "US30", label: "شاخص داوجونز" },
  { code: "US100", label: "شاخص نزدک" },
  { code: "US500", label: "شاخص اس‌اند‌پی" },
  { code: "BTCUSD", label: "بیت‌کوین / دلار" },
  { code: "ETHUSD", label: "اتریوم / دلار" },
];

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];
