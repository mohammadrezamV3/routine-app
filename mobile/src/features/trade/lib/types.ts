// پورت شده از lib/tradeTypes.ts (وب) — فقط enumها/برچسب‌ها/شکل داده که
// اپ موبایل واقعا لازم دارد؛ بدون وابستگی به SETTING_KEYS سمت سرور.

export type TradeAccountType = "REAL" | "DEMO" | "PROP" | "BACKTEST";
export type TradeGoalType = "AMOUNT" | "PERCENT";
export type TradeDirection = "BUY" | "SELL";
export type TradeStatus = "OPEN" | "CLOSED" | "CANCELED";
export type TradeResult = "PROFIT" | "LOSS" | "BREAKEVEN";
export type TradeSession = "SYDNEY" | "TOKYO" | "LONDON" | "NEWYORK";
export type VolumeUnit = "LOT" | "USD";

export const ACCOUNT_TYPE_LABELS: Record<TradeAccountType, string> = {
  REAL: "واقعی",
  DEMO: "دمو",
  PROP: "پراپ",
  BACKTEST: "بک‌تست",
};

export const DIRECTION_LABELS: Record<TradeDirection, string> = {
  BUY: "خرید (Buy)",
  SELL: "فروش (Sell)",
};

export const STATUS_LABELS: Record<TradeStatus, string> = {
  OPEN: "باز",
  CLOSED: "بسته",
  CANCELED: "لغو شده",
};

export const RESULT_LABELS: Record<TradeResult, string> = {
  PROFIT: "سود",
  LOSS: "ضرر",
  BREAKEVEN: "سربه‌سر",
};

export const ACCOUNT_CURRENCIES = ["USD", "EUR", "IRT", "IRR", "AED", "TRY", "GBP", "USDT"] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  IRT: "تومان",
  IRR: "ریال",
  AED: "د.إ",
  TRY: "₺",
  GBP: "£",
  USDT: "₮",
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

export const MAX_ACCOUNTS = 10;
export const MAX_TAGS = 40;
export const MAX_CHECKLISTS = 20;
export const MAX_CHECKLIST_ITEMS = 40;
export const MIN_CHECKLIST_ITEMS = 2;

export const TAG_COLORS = [
  "#8A9099", "#F08A24", "#16C79A", "#5B6BF5", "#EC4899",
  "#A855F7", "#F5B841", "#22C55E", "#EF4444", "#3E7BFA",
];

export type TradeTag = { id: string; name: string; color: string };

export type TradeChecklistSnapshotItem = { text: string; checked: boolean };

export type TradeImage = { id: string; dataUrl: string; caption: string | null; order: number };

/** حداقل فیلدهایی که آمار (tradeAnalytics.ts) به آن نیاز دارد */
export type StatEntry = { status: TradeStatus; pnl: number; rMultiple: number | null; openedAt: string };

/** سود/زیانِ علامت‌دار از «نتیجه + مقدار» — تنها جایی که این علامت ساخته می‌شود */
export function signedPnl(result: TradeResult, amount: number | null): number {
  const v = Math.abs(amount || 0);
  if (result === "PROFIT") return v;
  if (result === "LOSS") return -v;
  return 0;
}
