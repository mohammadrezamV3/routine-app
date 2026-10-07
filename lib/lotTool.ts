// حجم لات بر اساس حد ضرر به پیپ (صفحه‌ی /tools/lot-size-calculator) — منطق خالص
// روی همان ارزش پیپ lib/riskCalc.ts. ارز حساب دلار فرض می‌شود.

import { pipValuePerLot, symbolSpec } from "./riskCalc";

export const LOT_SYMBOLS: { code: string; label: string }[] = [
  { code: "EURUSD", label: "EURUSD (یورو / دلار)" },
  { code: "GBPUSD", label: "GBPUSD (پوند / دلار)" },
  { code: "AUDUSD", label: "AUDUSD (دلار استرالیا / دلار)" },
  { code: "NZDUSD", label: "NZDUSD (دلار نیوزیلند / دلار)" },
  { code: "USDJPY", label: "USDJPY (دلار / ین)" },
  { code: "USDCHF", label: "USDCHF (دلار / فرانک)" },
  { code: "USDCAD", label: "USDCAD (دلار / دلار کانادا)" },
  { code: "XAUUSD", label: "XAUUSD (طلا)" },
];

/** قیمت تقریبی فقط وقتی کاربر قیمت جفت‌ارزهای با پایه‌ی دلار را نداده */
const APPROX_PRICE: Record<string, number> = { USDJPY: 150, USDCHF: 0.9, USDCAD: 1.37 };

export type LotInput = {
  symbol: string;
  balance: number;
  mode: "percent" | "amount";
  riskValue: number;
  slPips: number;
  /** قیمت فعلی؛ فقط برای نمادهای با پایه‌ی دلار لازم است */
  price?: number | null;
};

export type LotResult =
  | {
      ok: true;
      lots: number;
      riskWanted: number;
      riskActual: number;
      pipValue: number;
      unit: "pip" | "point";
      approx: boolean;
      belowMin: boolean;
    }
  | { ok: false; error: string };

const fin = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** نماد پایه‌ی دلاری (مثل USDJPY) برای نشان‌دادن فیلد قیمت */
export function needsPrice(symbol: string): boolean {
  return symbolSpec(symbol).base === "USD";
}

export function calcLotByPips(inp: LotInput): LotResult {
  if (!fin(inp.slPips) || inp.slPips <= 0) return { ok: false, error: "حد ضرر را به پیپ وارد کن" };
  let riskWanted: number;
  if (inp.mode === "percent") {
    if (!fin(inp.balance) || inp.balance <= 0) return { ok: false, error: "موجودی حساب را وارد کن" };
    if (!fin(inp.riskValue) || inp.riskValue <= 0) return { ok: false, error: "درصد ریسک را وارد کن" };
    if (inp.riskValue > 100) return { ok: false, error: "درصد ریسک نمی‌تواند بیشتر از 100 باشد" };
    riskWanted = (inp.balance * inp.riskValue) / 100;
  } else {
    if (!fin(inp.riskValue) || inp.riskValue <= 0) return { ok: false, error: "مبلغ ریسک را به دلار وارد کن" };
    riskWanted = inp.riskValue;
  }
  const spec = symbolSpec(inp.symbol);
  const hasPrice = fin(inp.price) && inp.price > 0;
  const price = hasPrice ? (inp.price as number) : APPROX_PRICE[spec.symbol] ?? 1;
  const pv = pipValuePerLot(spec, price, null);
  if (!(pv.value > 0)) return { ok: false, error: "ارزش پیپ این نماد قابل محاسبه نیست" };
  const approx = pv.approx || (spec.base === "USD" && !hasPrice);
  const raw = riskWanted / (inp.slPips * pv.value);
  // گرد به پایین به گام 0.01 تا ریسک واقعی از ریسک خواسته‌شده بیشتر نشود
  const lots = Number((Math.floor(raw / 0.01 + 1e-9) * 0.01).toFixed(2));
  return {
    ok: true, lots, riskWanted, riskActual: lots * inp.slPips * pv.value,
    pipValue: pv.value, unit: spec.unit, approx, belowMin: lots <= 0,
  };
}
