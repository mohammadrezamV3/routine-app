// ماشین‌حساب ریسک و سود (اندازه‌ی پوزیشن + نسبت ریسک به سود) — منطق خالص.
//
// فرض‌های مستند (تا کسی عدد را «حقیقت بروکر» نگیرد):
//  1) ارز حساب همیشه دلار (USD) است.
//  2) اندازه‌ی قرارداد از `contractSize` در lib/tradeSymbols.ts می‌آید
//     (فارکس 100000، طلا 100 اونس، نقره 5000، نفت 1000 بشکه، شاخص و کریپتو 1).
//  3) «پیپ» = کوچک‌ترین واحد رایج: فارکس 0.0001 (جفت‌های ین 0.01)، طلا 0.1،
//     نقره 0.01، نفت 0.01، شاخص 1 واحد، کریپتو بسته به قیمت. هر بروکر کمی
//     فرق دارد؛ ارزش پیپ از (اندازه‌ی پیپ × اندازه‌ی قرارداد) حساب می‌شود،
//     پس نتیجه‌ی پولی به تعریف پیپ وابسته نیست، فقط عدد «پیپ» نمایشی.
//  4) ارز دوم جفت‌ها: اگر USD ارز دوم باشد ارزش پیپ مستقیم است؛ اگر USD ارز
//     اول باشد به قیمت ورود تقسیم می‌شود؛ در کراس‌ها (EURJPY و …) به نرخ
//     «یک واحد ارز دوم چند دلار است» نیاز است که کاربر می‌تواند بدهد وگرنه
//     نرخ تقریبی `APPROX_QUOTE_USD` به‌کار می‌رود و `approxQuoteRate` درست
//     می‌شود. شاخص‌ها و نفت و کریپتو دلاری فرض می‌شوند.
//  5) لات به پایین و به گام 0.01 گرد می‌شود تا ریسک واقعی هرگز از ریسک
//     خواسته‌شده بیشتر نشود. کمیسیون، اسپرد و سواپ حساب نمی‌شوند.

import { contractSize, symbolKind } from "./tradeSymbols";
import { tr } from "./i18n";

export type RiskDirection = "BUY" | "SELL";
export type RiskMode = "percent" | "amount";

/** نرخ تقریبی «یک واحد این ارز چند دلار» — فقط وقتی کاربر نرخ نداده. */
export const APPROX_QUOTE_USD: Record<string, number> = {
  EUR: 1.08, GBP: 1.27, AUD: 0.66, NZD: 0.6, CAD: 0.73, CHF: 1.12, JPY: 0.0067,
  TRY: 0.03, ZAR: 0.055, MXN: 0.055, SEK: 0.095, NOK: 0.093, CNH: 0.14,
};

const PIP_SIZE: Record<string, number> = {
  XAUUSD: 0.1, XAGUSD: 0.01, XPTUSD: 0.1, XPDUSD: 0.1,
  USOIL: 0.01, UKOIL: 0.01, NATGAS: 0.001,
  BTCUSD: 1, ETHUSD: 0.1, LTCUSD: 0.1, BNBUSD: 0.1, SOLUSD: 0.01,
  XRPUSD: 0.0001, DOGEUSD: 0.0001, ADAUSD: 0.0001,
};

export type SymbolSpec = {
  symbol: string;
  kind: ReturnType<typeof symbolKind>;
  /** اندازه‌ی یک پیپ/پوینت به واحد قیمت */
  pipSize: number;
  contractSize: number;
  /** برچسب واحد فاصله: پیپ یا پوینت */
  unit: "pip" | "point";
  /** تعداد رقم اعشار پیشنهادی برای قیمت */
  decimals: number;
  base: string | null;
  quote: string | null;
};

export function symbolSpec(raw: string): SymbolSpec {
  const symbol = raw.trim().toUpperCase();
  const kind = symbolKind(symbol);
  let pipSize = PIP_SIZE[symbol];
  let base: string | null = null;
  let quote: string | null = null;
  if (kind === "FOREX" && /^[A-Z]{6}$/.test(symbol)) {
    base = symbol.slice(0, 3);
    quote = symbol.slice(3);
    if (pipSize === undefined) pipSize = quote === "JPY" ? 0.01 : 0.0001;
  } else {
    quote = "USD";
  }
  if (pipSize === undefined) pipSize = kind === "INDEX" ? 1 : 0.0001;
  const decimals = Math.max(0, Math.round(-Math.log10(pipSize)) + (kind === "FOREX" ? 1 : 0));
  return {
    symbol, kind, pipSize, contractSize: contractSize(symbol),
    unit: kind === "INDEX" ? "point" : "pip",
    decimals, base, quote,
  };
}

/**
 * ارزش یک پیپ برای یک لات به دلار.
 * `quoteToUsd`: دلار به‌ازای یک واحد ارز دوم (فقط برای کراس‌ها لازم است).
 */
export function pipValuePerLot(
  spec: SymbolSpec,
  price: number,
  quoteToUsd?: number | null
): { value: number; approx: boolean } {
  const inQuote = spec.pipSize * spec.contractSize;
  if (!spec.quote || spec.quote === "USD") return { value: inQuote, approx: false };
  if (spec.base === "USD") return { value: price > 0 ? inQuote / price : 0, approx: false };
  if (quoteToUsd && quoteToUsd > 0) return { value: inQuote * quoteToUsd, approx: false };
  return { value: inQuote * (APPROX_QUOTE_USD[spec.quote] ?? 1), approx: true };
}

/** ارز دوم یک کراس (برای نشان‌دادن فیلد نرخ)؛ برای بقیه null */
export function crossQuoteCurrency(symbol: string): string | null {
  const s = symbolSpec(symbol);
  if (s.kind !== "FOREX" || !s.quote || !s.base) return null;
  return s.quote !== "USD" && s.base !== "USD" ? s.quote : null;
}

export type TakeProfitInput = { price: number; /** سهم از حجم، هر عدد مثبت؛ پیش‌فرض برابر */ share?: number };

export type RiskInput = {
  symbol: string;
  direction: RiskDirection;
  balance: number;
  mode: RiskMode;
  /** درصد (مثلا 1) یا مبلغ دلاری، بسته به mode */
  riskValue: number;
  entry: number;
  stopLoss: number;
  takeProfits?: TakeProfitInput[];
  quoteToUsd?: number | null;
  lotStep?: number;
};

export type TpResult = {
  price: number;
  pips: number;
  rr: number;
  /** سهم از حجم (0 تا 1) */
  share: number;
  /** سود این TP برای سهمش، دلار */
  profit: number;
};

export type RiskResult = {
  ok: true;
  spec: SymbolSpec;
  slDistance: number;
  slPips: number;
  pipValue: number;
  approxQuoteRate: boolean;
  /** ریسک خواسته‌شده، دلار */
  riskWanted: number;
  /** لات خام (بدون گرد) */
  lotsRaw: number;
  lots: number;
  /** ریسک واقعی با لات گردشده */
  riskAmount: number;
  riskPercent: number;
  tps: TpResult[];
  totalProfit: number;
  /** نسبت وزنی کل (سود کل / ریسک) یا null بدون TP */
  rr: number | null;
  /** حداقل درصد برد برای سر به سر شدن: 1 / (1 + RR) */
  breakevenWinRate: number | null;
  warnings: string[];
};

export type RiskFailure = { ok: false; error: string };

const fin = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export function calcRisk(inp: RiskInput): RiskResult | RiskFailure {
  const { direction, entry, stopLoss } = inp;
  if (!inp.symbol.trim()) return { ok: false, error: tr("نماد را انتخاب کن", "Select a symbol") };
  if (!fin(entry) || entry <= 0) return { ok: false, error: tr("قیمت ورود را وارد کن", "Enter the entry price") };
  if (!fin(stopLoss) || stopLoss <= 0) return { ok: false, error: tr("حد ضرر را وارد کن", "Enter the stop loss") };
  if (stopLoss === entry) return { ok: false, error: tr("حد ضرر نمی‌تواند با قیمت ورود برابر باشد", "Stop loss cannot be equal to the entry price") };
  if (direction === "BUY" && stopLoss > entry) return { ok: false, error: tr("در خرید، حد ضرر باید پایین‌تر از قیمت ورود باشد", "For a buy, the stop loss must be below the entry price") };
  if (direction === "SELL" && stopLoss < entry) return { ok: false, error: tr("در فروش، حد ضرر باید بالاتر از قیمت ورود باشد", "For a sell, the stop loss must be above the entry price") };

  let riskWanted: number;
  if (inp.mode === "percent") {
    if (!fin(inp.balance) || inp.balance <= 0) return { ok: false, error: tr("موجودی حساب را وارد کن", "Enter the account balance") };
    if (!fin(inp.riskValue) || inp.riskValue <= 0) return { ok: false, error: tr("درصد ریسک را وارد کن", "Enter the risk percentage") };
    if (inp.riskValue > 100) return { ok: false, error: tr("درصد ریسک نمی‌تواند بیشتر از 100 باشد", "Risk percentage cannot be more than 100") };
    riskWanted = (inp.balance * inp.riskValue) / 100;
  } else {
    if (!fin(inp.riskValue) || inp.riskValue <= 0) return { ok: false, error: tr("مبلغ ریسک را وارد کن", "Enter the risk amount") };
    riskWanted = inp.riskValue;
  }

  const spec = symbolSpec(inp.symbol);
  const slDistance = Math.abs(entry - stopLoss);
  const slPips = slDistance / spec.pipSize;
  const pv = pipValuePerLot(spec, entry, inp.quoteToUsd);
  if (!(pv.value > 0)) return { ok: false, error: tr("ارزش پیپ این نماد قابل محاسبه نیست", "The pip value of this symbol cannot be calculated") };

  const step = inp.lotStep && inp.lotStep > 0 ? inp.lotStep : 0.01;
  const lotsRaw = riskWanted / (slPips * pv.value);
  // epsilon برای خطای اعشاری (مثلا 0.0999999 باید 0.1 شود)
  const stepped = Math.floor(lotsRaw / step + 1e-9) * step;
  const lots = Number(stepped.toFixed(Math.max(0, Math.round(-Math.log10(step)))));
  const riskAmount = lots * slPips * pv.value;

  const warnings: string[] = [];
  if (lots <= 0) warnings.push(tr("با این ریسک و فاصله‌ی حد ضرر، لات از حداقل (0.01) کمتر می‌شود", "With this risk and stop loss distance, the lot size falls below the minimum (0.01)"));
  if (pv.approx) warnings.push(tr("نرخ تبدیل ارز دوم تقریبی است — برای عدد دقیق‌تر نرخ را وارد کن", "The conversion rate of the second currency is approximate. Enter the rate for a more accurate number"));
  if (inp.mode === "percent" && inp.riskValue > 5) warnings.push(tr("ریسک بیشتر از 5 درصد در هر معامله خطرناک است", "Risking more than 5 percent per trade is dangerous"));

  // هدف‌ها: فقط سمت درست (در خرید بالاتر از ورود، در فروش پایین‌تر)
  const rawTps = (inp.takeProfits || []).filter((t) => fin(t.price) && t.price > 0);
  for (const t of rawTps) {
    const right = direction === "BUY" ? t.price > entry : t.price < entry;
    if (!right) {
      return {
        ok: false,
        error: direction === "BUY" ? tr("در خرید، حد سود باید بالاتر از قیمت ورود باشد", "For a buy, the take profit must be above the entry price") : tr("در فروش، حد سود باید پایین‌تر از قیمت ورود باشد", "For a sell, the take profit must be below the entry price"),
      };
    }
  }
  const shareOf = (t: TakeProfitInput) => (fin(t.share) && t.share > 0 ? t.share : 0);
  const shareSum = rawTps.reduce((s, t) => s + shareOf(t), 0);
  const equal = shareSum <= 0;
  const tps: TpResult[] = rawTps.map((t) => {
    const share = equal ? 1 / rawTps.length : shareOf(t) / shareSum;
    const pips = Math.abs(t.price - entry) / spec.pipSize;
    return { price: t.price, pips, rr: pips / slPips, share, profit: lots * share * pips * pv.value };
  });
  const totalProfit = tps.reduce((s, t) => s + t.profit, 0);
  // نسبت وزنی: به سهم هر هدف؛ مستقل از گرد‌شدن لات
  const rr = tps.length ? tps.reduce((s, t) => s + t.rr * t.share, 0) : null;
  const breakevenWinRate = rr === null ? null : 1 / (1 + rr);

  return {
    ok: true,
    spec,
    slDistance,
    slPips,
    pipValue: pv.value,
    approxQuoteRate: pv.approx,
    riskWanted,
    lotsRaw,
    lots,
    riskAmount,
    riskPercent: inp.mode === "percent" && inp.balance > 0 ? (riskAmount / inp.balance) * 100 : 0,
    tps,
    totalProfit,
    rr,
    breakevenWinRate,
    warnings,
  };
}

export type SimplePipInput = {
  symbol: string;
  pips: number;
  lots: number;
  /** دلار به‌ازای یک واحد ارز دوم (برای نمادهای غیردلاری) */
  quoteRate?: number | null;
  /** موجودی برای محاسبه‌ی درصد (اختیاری) */
  balance?: number | null;
};

export type SimplePipResult = {
  ok: true;
  spec: SymbolSpec;
  pipValuePerLot: number;
  pipValueForLots: number;
  total: number;
  /** درصد از موجودی؛ null اگر موجودی داده نشده */
  percent: number | null;
  approxQuoteRate: boolean;
};

/** ارز دوم نماد غیر از دلار است؟ (برای نشان‌دادن فیلد نرخ در حالت ساده) */
export function nonUsdQuote(symbol: string): string | null {
  const s = symbolSpec(symbol);
  return s.quote && s.quote !== "USD" ? s.quote : null;
}

/** حالت ساده: پیپ و لات می‌دهی، مبلغ دلاری می‌گیری. */
export function simplePipCalc(inp: SimplePipInput): SimplePipResult | RiskFailure {
  if (!inp.symbol.trim()) return { ok: false, error: tr("نماد را انتخاب کن", "Select a symbol") };
  if (!fin(inp.pips) || inp.pips <= 0) return { ok: false, error: tr("تعداد پیپ را وارد کن", "Enter the number of pips") };
  if (!fin(inp.lots) || inp.lots <= 0) return { ok: false, error: tr("حجم (لات) را وارد کن", "Enter the volume (lots)") };
  const spec = symbolSpec(inp.symbol);
  const inQuote = spec.pipSize * spec.contractSize;
  let value: number;
  let approx = false;
  if (!spec.quote || spec.quote === "USD") value = inQuote;
  else if (inp.quoteRate && inp.quoteRate > 0) value = inQuote * inp.quoteRate;
  else { value = inQuote * (APPROX_QUOTE_USD[spec.quote] ?? 1); approx = true; }
  if (!(value > 0)) return { ok: false, error: tr("ارزش پیپ این نماد قابل محاسبه نیست", "The pip value of this symbol cannot be calculated") };
  const total = inp.pips * value * inp.lots;
  const percent = fin(inp.balance) && inp.balance > 0 ? (total / inp.balance) * 100 : null;
  return { ok: true, spec, pipValuePerLot: value, pipValueForLots: value * inp.lots, total, percent, approxQuoteRate: approx };
}

/** رقم اعشار مناسب برای نمایش قیمت */
export function priceDecimals(symbol: string): number {
  return symbolSpec(symbol).decimals;
}

/** گرد‌کردن نمایشی با ارقام لاتین */
export function fmtNum(n: number, max = 2): string {
  if (!Number.isFinite(n)) return "—";
  return Number(n.toFixed(max)).toLocaleString("en-US", { maximumFractionDigits: max });
}

const YAHOO_MAP: Record<string, string> = {
  XAUUSD: "GC=F", XAGUSD: "SI=F", XPTUSD: "PL=F", XPDUSD: "PA=F",
  USOIL: "CL=F", UKOIL: "BZ=F", NATGAS: "NG=F",
  US30: "^DJI", US100: "^NDX", US500: "^GSPC", GER40: "^GDAXI", UK100: "^FTSE", JPN225: "^N225", FRA40: "^FCHI",
};

/** کد بروکری به نماد یاهو برای قیمت لحظه‌ای (null اگر ناشناخته) */
export function yahooSymbolFor(code: string): string | null {
  const c = code.trim().toUpperCase();
  if (YAHOO_MAP[c]) return YAHOO_MAP[c];
  const spec = symbolSpec(c);
  if (spec.kind === "CRYPTO" && c.endsWith("USD")) return `${c.slice(0, -3)}-USD`;
  if (spec.kind === "FOREX" && /^[A-Z]{6}$/.test(c)) return `${c}=X`;
  return null;
}
