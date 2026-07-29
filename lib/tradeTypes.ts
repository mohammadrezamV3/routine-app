export type TradeEntry = {
  id: string;
  pair: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number | null;
  lotSize: number;
  pnl: number | null;
  riskPercent: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  strategy: string | null;
  screenshotUrl: string | null;
  openedAt: string;
  notes: string | null;
};

// حالت فرم (رشته‌ای، برای بایند شدن مستقیم به input) — هم فرم «ثبت معامله
// جدید» و هم فرم «ویرایش معامله» از همین شکل استفاده می‌کنن
export type TradeFormState = {
  pair: string;
  direction: "long" | "short";
  entryPrice: string;
  exitPrice: string;
  lotSize: string;
  pnl: string;
  stopLoss: string;
  takeProfit: string;
  riskPercent: string;
  strategy: string;
  notes: string;
  screenshotUrl: string | null;
};

export const EMPTY_TRADE_FORM: TradeFormState = {
  pair: "EURUSD",
  direction: "long",
  entryPrice: "",
  exitPrice: "",
  lotSize: "",
  pnl: "",
  stopLoss: "",
  takeProfit: "",
  riskPercent: "",
  strategy: "",
  notes: "",
  screenshotUrl: null,
};

export function tradeEntryToFormState(e: TradeEntry): TradeFormState {
  return {
    pair: e.pair,
    direction: e.direction,
    entryPrice: String(e.entryPrice),
    exitPrice: e.exitPrice !== null ? String(e.exitPrice) : "",
    lotSize: String(e.lotSize),
    pnl: e.pnl !== null ? String(e.pnl) : "",
    stopLoss: e.stopLoss !== null ? String(e.stopLoss) : "",
    takeProfit: e.takeProfit !== null ? String(e.takeProfit) : "",
    riskPercent: e.riskPercent !== null ? String(e.riskPercent) : "",
    strategy: e.strategy || "",
    notes: e.notes || "",
    screenshotUrl: e.screenshotUrl,
  };
}

// برای POST — فیلد خالی یعنی «ارسال نشه» (سرور مقدار پیش‌فرض/نال خودش رو می‌ذاره)
export function formStateToCreateBody(v: TradeFormState) {
  return {
    pair: v.pair,
    direction: v.direction,
    entryPrice: v.entryPrice ? +v.entryPrice : undefined,
    exitPrice: v.exitPrice ? +v.exitPrice : undefined,
    lotSize: v.lotSize ? +v.lotSize : undefined,
    pnl: v.pnl ? +v.pnl : undefined,
    stopLoss: v.stopLoss ? +v.stopLoss : undefined,
    takeProfit: v.takeProfit ? +v.takeProfit : undefined,
    riskPercent: v.riskPercent ? +v.riskPercent : undefined,
    strategy: v.strategy || undefined,
    notes: v.notes || undefined,
    screenshotUrl: v.screenshotUrl || undefined,
  };
}

// برای PATCH — فرم همیشه کل رکورد رو نشون می‌ده، پس خالی‌بودن یعنی «پاک شد»
// (null صریح)، نه «دست نخورده بمونه»
export function formStateToUpdateBody(id: string, v: TradeFormState) {
  return {
    id,
    pair: v.pair,
    direction: v.direction,
    entryPrice: v.entryPrice ? +v.entryPrice : null,
    exitPrice: v.exitPrice ? +v.exitPrice : null,
    lotSize: v.lotSize ? +v.lotSize : null,
    pnl: v.pnl ? +v.pnl : null,
    stopLoss: v.stopLoss ? +v.stopLoss : null,
    takeProfit: v.takeProfit ? +v.takeProfit : null,
    riskPercent: v.riskPercent ? +v.riskPercent : null,
    strategy: v.strategy || null,
    notes: v.notes || null,
    screenshotUrl: v.screenshotUrl || null,
  };
}
