// اتصال متاتریدر — منطق مشترک کد/توکن و نرمال‌سازی معاملات ورودی.
//
// مدل امنیتی (خلاصه، تا کسی موقع تغییر ندانسته نشکندش):
//   ۱) رمز حساب معاملاتی هیچ‌وقت از کاربر خواسته و هیچ‌جا ذخیره نمی‌شود.
//      ارتباط یک‌طرفه است: EA فقط داده می‌فرستد، Arion هیچ دستوری برنمی‌گرداند.
//   ۲) کاربر در Arion یک «کد اتصال» می‌گیرد (یک‌بارمصرف، ۱۵ دقیقه‌ای) و
//      همان را در تنظیمات EA می‌گذارد. EA یک‌بار آن را می‌فرستد و در عوض
//      یک توکن دائمی می‌گیرد؛ از آن به بعد فقط توکن رد و بدل می‌شود.
//   ۳) نه کد و نه توکن خام ذخیره نمی‌شوند — فقط SHA-256. چون هر دو رشته‌ی
//      تصادفی پرآنتروپی‌اند (نه رمز انتخابی انسان)، هش سریع درست است:
//      حمله‌ی دیکشنری روی ۱۶۰ بیت آنتروپی بی‌معناست، و برخلاف bcrypt
//      اجازه‌ی جست‌وجوی مستقیم با ایندکس را هم می‌دهد.
//   ۴) توکن هر لحظه از پنل قابل ابطال است و ابطال فوری اثر می‌کند (چون
//      هر درخواست مستقیم به دیتابیس می‌خورد، نه به یک JWT امضاشده).

import { createHash, randomBytes } from "crypto";

export type MtPlatform = "MT4" | "MT5";

/** بدون حروف/ارقام شبیه‌به‌هم (0/O، 1/I) — کاربر باید این را دستی تایپ کند */
const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIRING_LENGTH = 12;
export const PAIRING_TTL_MS = 15 * 60_000;

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** کد اتصال: ۱۲ کاراکتر از الفبای ۳۲تایی ≈ ۶۰ بیت آنتروپی */
export function generatePairingCode(): string {
  const bytes = randomBytes(PAIRING_LENGTH);
  let out = "";
  for (let i = 0; i < PAIRING_LENGTH; i++) out += PAIRING_ALPHABET[bytes[i] % PAIRING_ALPHABET.length];
  return out.replace(/(.{4})(?=.)/g, "$1-"); // ABCD-EFGH-JKLM
}

export function normalizePairingCode(raw: string): string {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(.{4})(?=.)/g, "$1-");
}

/** توکن دائمی EA — ۳۲ بایت تصادفی (۲۵۶ بیت) */
export function generateEaToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenPrefixOf(token: string): string {
  return token.slice(0, 8);
}

// ── نرمال‌سازی معاملات ارسالی EA ────────────────────────────────────────

export type MtTradeInput = {
  externalId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  volume: number;
  openPrice: number | null;
  closePrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number;
  commission: number | null;
  swap: number | null;
  openTime: Date;
  closeTime: Date | null;
  closed: boolean;
};

/** سقف ردیف در هر درخواست. EAها چانک‌های ≤۳۰۰تایی می‌فرستند؛ این فقط سپر سوءاستفاده‌ست. */
export const MT_MAX_TRADES_PER_REQUEST = 1000;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  // رشته با ممیز «,» (ترمینال با locale اروپایی/اکسپرت دست‌ساز) هم قبول است
  const n = typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** قیمت/حدضرر/حدسود: MQL «نداشتن» را با 0 نشان می‌دهد — 0 یعنی null، نه قیمت صفر */
function price(v: unknown): number | null {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
}

function parseTime(v: unknown): Date | null {
  // ثانیه‌ی یونیکس (چیزی که MQL می‌دهد) — نه میلی‌ثانیه. عدد رشته‌ای هم همین.
  // ۰ (OrderCloseTime() معامله‌ی باز در MT4) یعنی «ندارد»، نه ۱ ژانویه‌ی ۱۹۷۰.
  const asNum = typeof v === "number" ? v : typeof v === "string" && /^\s*\d+\s*$/.test(v) ? Number(v) : null;
  if (asNum !== null) {
    if (!Number.isFinite(asNum) || asNum <= 0) return null;
    const d = new Date(asNum * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * نماد بروکر را تمیز می‌کند. قبلا یک regex سخت‌گیر (`[A-Z0-9._#-]`، حداکثر
 * ۲۰) داشتیم که نمادهای کاملا رایج بروکرها مثل `EURUSD+`، `XAUUSD!`،
 * `US30 Cash`، `BTC/USD`، `.US500` یا `[DJI30]` را رد می‌کرد — و هر معامله
 * روی چنین نمادی *بی‌صدا* دور ریخته می‌شد (ریشه‌ی «فقط ۲ تا از ۱۰ معامله
 * رسید»). حالا فقط کاراکترهای کنترلی حذف و طول محدود می‌شود.
 */
export function cleanMtSymbol(v: unknown): string {
  return String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 32);
}

/**
 * ردیف‌های خام EA را به شکل داخلی تبدیل می‌کند.
 * ردیف بدشکل بی‌صدا کنار گذاشته می‌شود، نه اینکه کل sync را بشکند — یک
 * نماد عجیب بروکر نباید باعث شود بقیه‌ی معاملات هم ثبت نشوند. فقط چیزهایی
 * که بدونشان واقعا نمی‌شود ردیف ساخت (شناسه، نماد، زمان باز شدن) اجباری‌اند؛
 * نبود SL/TP/قیمت/کمیسیون هیچ‌وقت باعث رد شدن نمی‌شود.
 */
export function normalizeMtTrades(raw: unknown): MtTradeInput[] {
  if (!Array.isArray(raw)) return [];
  const out: MtTradeInput[] = [];
  for (const item of raw.slice(0, MT_MAX_TRADES_PER_REQUEST)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    const externalId = String(r.ticket ?? r.id ?? r.externalId ?? "").trim().slice(0, 40);
    if (!externalId || externalId === "0") continue;

    const symbol = cleanMtSymbol(r.symbol);
    if (!symbol) continue;

    const typeRaw = String(r.type ?? r.direction ?? "").toUpperCase();
    // MQL هم رشته می‌دهد هم عدد نوع سفارش (۰ = buy، ۱ = sell)
    const direction: "BUY" | "SELL" =
      typeRaw.includes("SELL") || typeRaw === "1" ? "SELL" : "BUY";

    // اکسپرت‌های قدیمی حجم را با %.2f می‌فرستادند؛ ۰٫۰۰۱ لات (کریپتو/میکرو)
    // «0.00» می‌شد. معامله را به‌خاطرش دور نمی‌ریزیم — حجم ۰ ثبت می‌شود.
    const volRaw = num(r.volume ?? r.lots);
    const volume = volRaw !== null && volRaw > 0 ? volRaw : 0;

    const openTime = parseTime(r.openTime ?? r.open_time);
    if (!openTime) continue;

    const closeTime = parseTime(r.closeTime ?? r.close_time);
    const closePriceRaw = price(r.closePrice ?? r.close_price);
    // «closed» صریح همیشه برنده است. قبلا MT4 برای معامله‌ی باز closeTime=0
    // و closePrice=قیمت لحظه‌ای می‌فرستاد و این‌جا «بسته» حساب می‌شد.
    const closed =
      r.closed === true || r.closed === "true"
        ? true
        : r.closed === false || r.closed === "false"
          ? false
          : !!closeTime && closePriceRaw !== null;

    out.push({
      externalId,
      symbol,
      direction,
      volume,
      openPrice: price(r.openPrice ?? r.open_price),
      closePrice: closed ? closePriceRaw : null,
      stopLoss: price(r.stopLoss ?? r.sl),
      takeProfit: price(r.takeProfit ?? r.tp),
      profit: num(r.profit) ?? 0,
      commission: num(r.commission),
      swap: num(r.swap),
      openTime,
      // اکسپرت قدیمی MT5 برای معامله‌ی بسته closeTime نمی‌داد مگر همراه openTime
      closeTime: closed ? closeTime ?? openTime : null,
      closed,
    });
  }
  return out;
}

/**
 * اختلاف ساعت سرور بروکر با UTC (دقیقه) → میلی‌ثانیه. اکسپرت قدیمی آن را
 * از TimeCurrent()−TimeGMT() می‌گیرد که به زمان *آخرین تیک* وابسته است و
 * چند ثانیه/دقیقه عقب است (۱۱۹ به‌جای ۱۲۰) — به نزدیک‌ترین ۱۵ دقیقه گرد
 * می‌شود. بیرون از ±۱۴ ساعت (بازار بسته/آخر هفته) یعنی نامعتبر → ۰.
 */
export function normalizeTzOffsetMs(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || Math.abs(n) > 14 * 60) return 0;
  return Math.round(n / 15) * 15 * 60_000;
}

export type MtTradeData = {
  symbol: string;
  direction: "BUY" | "SELL";
  volume: number;
  volumeUnit: string;
  openedAt: Date;
  closedAt: Date | null;
  status: "CLOSED" | "OPEN";
  result: "PROFIT" | "LOSS" | "BREAKEVEN";
  pnl: number;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  commission: number | null;
  swap: number | null;
  externalSource: string;
};

/** ردیف نرمال‌شده → داده‌ی TradeEntry (بدون sessions که به lib سرور وابسته است). */
export function mtTradeToEntryData(t: MtTradeInput, tzOffsetMs: number, platform: string): MtTradeData {
  const toUtc = (d: Date | null) => (d && tzOffsetMs ? new Date(d.getTime() - tzOffsetMs) : d);
  // «profit»ی که EA می‌فرستد (OrderProfit در MT4، DEAL_PROFIT در MT5) طبق
  // داکیومنت متاتریدر فقط سود خام قیمتی‌ست و کمیسیون/سواپ را شامل نمی‌شود؛
  // pnl این جدول باید خالص باشد، پس یک‌بار همین‌جا جمع می‌شوند.
  const pnl = Math.round((t.profit + (t.commission ?? 0) + (t.swap ?? 0)) * 100) / 100;
  return {
    symbol: t.symbol,
    direction: t.direction,
    volume: t.volume,
    volumeUnit: "LOT",
    openedAt: toUtc(t.openTime)!,
    closedAt: toUtc(t.closeTime),
    status: t.closed ? "CLOSED" : "OPEN",
    result: pnl > 0 ? "PROFIT" : pnl < 0 ? "LOSS" : "BREAKEVEN",
    pnl: t.closed ? pnl : 0,
    entryPrice: t.openPrice,
    exitPrice: t.closePrice,
    stopLoss: t.stopLoss,
    takeProfit: t.takeProfit,
    commission: t.commission,
    swap: t.swap,
    externalSource: platform,
  };
}

/**
 * داده‌ی آپدیت یک معامله‌ی *موجود*. فیلدهای اختیاری که این بار نیامده‌اند
 * (null) مقدار قبلی را پاک نمی‌کنند: اکسپرت قدیمی MT5 برای معامله‌ی بسته
 * قیمت ورود/SL/TP نمی‌فرستاد و openTime را همان زمان بستن می‌گذاشت، و
 * همین باعث می‌شد معامله‌ای که وقت باز بودن کامل ثبت شده بود بعد از بسته
 * شدن ناقص شود. وقتی قیمت ورود نیامده، زمان ورود قبلی هم حفظ می‌شود.
 */
export function mtUpdateData(data: MtTradeData, t: MtTradeInput): Partial<MtTradeData> {
  const out: Partial<MtTradeData> = { ...data };
  for (const k of ["entryPrice", "exitPrice", "stopLoss", "takeProfit", "commission", "swap"] as const) {
    if (out[k] === null) delete out[k];
  }
  if (out.volume === 0) delete out.volume;
  if (t.openPrice === null) delete out.openedAt;
  return out;
}

// ── گردش پول غیرمعاملاتی (واریز/برداشت/هزینه/مالیات/...) ───────────────

export const MT_CASHFLOW_KINDS = [
  "DEPOSIT", "WITHDRAWAL", "CREDIT", "BONUS",
  "COMMISSION", "FEE", "TAX", "INTEREST", "DIVIDEND", "SWAP", "CORRECTION", "OTHER",
] as const;
export type MtCashflowKind = (typeof MT_CASHFLOW_KINDS)[number];

/** واریز/برداشت/اعتبار/بونوس = پول وارد/خارج‌شده؛ بقیه هزینه/درآمد غیرمعاملاتی‌ان */
export const MT_FUNDING_KINDS: readonly MtCashflowKind[] = ["DEPOSIT", "WITHDRAWAL", "CREDIT", "BONUS"];

export type MtCashflowInput = {
  externalId: string;
  kind: MtCashflowKind;
  amount: number;
  occurredAt: Date;
  comment: string | null;
};

/**
 * نوع یک ردیف گردش پول. EA نوع خام پلتفرم رو می‌فرسته (MT5: اسم DEAL_TYPE مثل
 * «TAX»/«COMMISSION_DAILY»/«BALANCE»؛ MT4: «BALANCE»/«CREDIT» چون MT4 همه‌چیز رو
 * با نوع ۶ ثبت می‌کنه). ردیف «BALANCE» با کامنت بروکر دقیق‌تر می‌شه (خیلی از
 * بروکرها مالیات/کمیسیون/سواپ رو با همین نوع و یک کامنت ثبت می‌کنن)، وگرنه
 * با علامت مبلغ واریز یا برداشت حساب می‌شه.
 */
export function classifyMtCashflow(rawType: unknown, amount: number, comment: string | null): MtCashflowKind {
  const t = String(rawType ?? "").toUpperCase().replace(/^DEAL_TYPE_|^DEAL_/, "");
  const c = (comment || "").toLowerCase();
  if (t.includes("TAX")) return "TAX";
  if (t.includes("COMMISSION")) return "COMMISSION";
  if (t.includes("INTEREST")) return "INTEREST";
  if (t.includes("DIVIDEND")) return "DIVIDEND";
  if (t.includes("BONUS")) return "BONUS";
  if (t.includes("CREDIT")) return "CREDIT";
  if (t.includes("CORRECTION")) return "CORRECTION";
  if (t.includes("CHARGE") || t.includes("FEE")) return "FEE";
  if (t === "BALANCE" || t === "6" || t === "") {
    if (/\btax|withholding|vat\b/.test(c)) return "TAX";
    if (/commission|comm\b/.test(c)) return "COMMISSION";
    if (/swap|rollover|overnight/.test(c)) return "SWAP";
    if (/interest/.test(c)) return "INTEREST";
    if (/dividend/.test(c)) return "DIVIDEND";
    if (/\bfee|charge|inactivity/.test(c)) return "FEE";
    if (/bonus/.test(c)) return "BONUS";
    return amount >= 0 ? "DEPOSIT" : "WITHDRAWAL";
  }
  if (t === "7") return "CREDIT";
  return "OTHER";
}

/** ردیف‌های خام گردش پول EA → شکل داخلی؛ ردیف بدشکل بی‌صدا کنار گذاشته می‌شه */
export function normalizeMtCashflows(raw: unknown): MtCashflowInput[] {
  if (!Array.isArray(raw)) return [];
  const out: MtCashflowInput[] = [];
  for (const item of raw.slice(0, MT_MAX_TRADES_PER_REQUEST)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const externalId = String(r.ticket ?? r.id ?? "").trim().slice(0, 40);
    if (!externalId || externalId === "0") continue;
    const amount = num(r.amount);
    if (amount === null || amount === 0) continue;
    const occurredAt = parseTime(r.time);
    if (!occurredAt) continue;
    const comment = r.comment ? String(r.comment).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) || null : null;
    out.push({
      externalId,
      kind: classifyMtCashflow(r.type, amount, comment),
      amount: Math.round(amount * 100) / 100,
      occurredAt,
      comment,
    });
  }
  return out;
}

export type CashflowSummary = {
  /** واریز − برداشت + اعتبار + بونوس */
  funding: number;
  /** هزینه/درآمد غیرمعاملاتی (مالیات، کمیسیون حساب، بهره، سود سهام، اصلاحیه، ...) */
  charges: number;
};

export function summarizeCashflows(rows: { kind: string; amount: number }[]): CashflowSummary {
  let funding = 0;
  let charges = 0;
  for (const r of rows) {
    if ((MT_FUNDING_KINDS as readonly string[]).includes(r.kind)) funding += r.amount;
    else charges += r.amount;
  }
  return { funding: Math.round(funding * 100) / 100, charges: Math.round(charges * 100) / 100 };
}

/** کپشن ثابت اسکرین‌های خودکار اکسپرت (app/api/mt/screenshot) — با همین شناخته و جایگزین می‌شن */
export const MT_SHOT_CAPTION = { entry: "اسکرین ورود (متاتریدر)", exit: "اسکرین خروج (متاتریدر)" } as const;
