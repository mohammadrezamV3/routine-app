// مدیریت سرمایه روی اکسپرت متاتریدر: شکل قوانین هر حساب، پیش‌فرض‌ها، اعتبارسنجی
// (clamp) و لاگ اقدام‌های اکسپرت. منطق خالص؛ هیچ import سروری این‌جا نیست.
// اجرای واقعی قوانین در public/ea/Arion-MT5.mq5 و Arion-MT4.mq4 انجام می‌شود.

export type MoneyRules = {
  enabled: boolean;
  /** حداکثر ضرر هر پوزیشن (درصد بالانس) اگر SL بخورد؛ اکسپرت حجم اضافه را می‌بندد */
  riskPerTradePct: number;
  /** پوزیشن بدون حد ضرر مجاز نیست */
  requireSL: boolean;
  /** درصد ریسک برای گذاشتن خودکار SL؛ صفر یعنی پوزیشن بعد از slGraceSec بسته می‌شود */
  autoSLPct: number;
  slGraceSec: number;
  /** صفر = خاموش */
  maxOpenTrades: number;
  maxDailyTrades: number;
  maxDailyLossPct: number;
  dailyProfitTargetPct: number;
  lockOnTarget: boolean;
  breakEvenAtR: number;
  beOffsetPoints: number;
  trailingStartR: number;
  trailingDistR: number;
};

export const MONEY_RULE_LIMITS = {
  riskPerTradePct: { min: 0.1, max: 10 },
  slGraceSec: { min: 10, max: 600 },
  maxOpenTrades: { min: 1, max: 50 },
  maxDailyTrades: { min: 1, max: 100 },
  maxDailyLossPct: { min: 0.5, max: 50 },
  dailyProfitTargetPct: { min: 0.5, max: 100 },
  breakEvenAtR: { min: 0.5, max: 5 },
  beOffsetPoints: { min: 0, max: 100 },
  trailingStartR: { min: 0.5, max: 10 },
  trailingDistR: { min: 0.2, max: 5 },
} as const;

export const DEFAULT_MONEY_RULES: MoneyRules = {
  enabled: false,
  riskPerTradePct: 1,
  requireSL: true,
  autoSLPct: 0,
  slGraceSec: 60,
  maxOpenTrades: 0,
  maxDailyTrades: 0,
  maxDailyLossPct: 0,
  dailyProfitTargetPct: 0,
  lockOnTarget: true,
  breakEvenAtR: 0,
  beOffsetPoints: 0,
  trailingStartR: 0,
  trailingDistR: 0,
};

function num(v: unknown): number | null {
  if (typeof v === "string" && v.trim() !== "") v = Number(v.replace(/,/g, "."));
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function round(n: number, d: number): number {
  const k = Math.pow(10, d);
  return Math.round(n * k) / k;
}

/** عدد در بازه؛ نامعتبر → پیش‌فرض */
function clampNum(v: unknown, min: number, max: number, def: number, dec = 2): number {
  const n = num(v);
  if (n === null) return def;
  return round(Math.min(max, Math.max(min, n)), dec);
}

/** مقدار «صفر = خاموش»: صفر یا کمتر خاموش؛ بقیه داخل بازه */
function clampOptional(v: unknown, min: number, max: number, def: number, dec = 2, intOnly = false): number {
  const n = num(v);
  if (n === null) return def;
  if (n <= 0) return 0;
  const c = Math.min(max, Math.max(min, intOnly ? Math.round(n) : n));
  return intOnly ? c : round(c, dec);
}

function bool(v: unknown, def: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "true") return true;
  if (v === 0 || v === "0" || v === "false") return false;
  return def;
}

/** هر ورودی ناشناخته → قوانین کاملا معتبر (فیلد نامعتبر = پیش‌فرض یا مقدار قبلی) */
export function validateMoneyRules(input: unknown, base: MoneyRules = DEFAULT_MONEY_RULES): MoneyRules {
  const o = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const L = MONEY_RULE_LIMITS;
  const riskPerTradePct = clampNum(o.riskPerTradePct, L.riskPerTradePct.min, L.riskPerTradePct.max, base.riskPerTradePct);
  // ریسک SL خودکار هیچ‌وقت از سقف ریسک هر معامله بیشتر نمی‌شود
  const autoSLPct = Math.min(
    riskPerTradePct,
    clampOptional(o.autoSLPct, L.riskPerTradePct.min, L.riskPerTradePct.max, base.autoSLPct),
  );
  const trailingStartR = clampOptional(o.trailingStartR, L.trailingStartR.min, L.trailingStartR.max, base.trailingStartR);
  const trailingDistR = clampOptional(o.trailingDistR, L.trailingDistR.min, L.trailingDistR.max, base.trailingDistR);
  return {
    enabled: bool(o.enabled, base.enabled),
    riskPerTradePct,
    requireSL: bool(o.requireSL, base.requireSL),
    autoSLPct,
    slGraceSec: Math.round(clampNum(o.slGraceSec, L.slGraceSec.min, L.slGraceSec.max, base.slGraceSec, 0)),
    maxOpenTrades: clampOptional(o.maxOpenTrades, L.maxOpenTrades.min, L.maxOpenTrades.max, base.maxOpenTrades, 0, true),
    maxDailyTrades: clampOptional(o.maxDailyTrades, L.maxDailyTrades.min, L.maxDailyTrades.max, base.maxDailyTrades, 0, true),
    maxDailyLossPct: clampOptional(o.maxDailyLossPct, L.maxDailyLossPct.min, L.maxDailyLossPct.max, base.maxDailyLossPct),
    dailyProfitTargetPct: clampOptional(o.dailyProfitTargetPct, L.dailyProfitTargetPct.min, L.dailyProfitTargetPct.max, base.dailyProfitTargetPct),
    lockOnTarget: bool(o.lockOnTarget, base.lockOnTarget),
    breakEvenAtR: clampOptional(o.breakEvenAtR, L.breakEvenAtR.min, L.breakEvenAtR.max, base.breakEvenAtR),
    beOffsetPoints: Math.round(clampNum(o.beOffsetPoints, L.beOffsetPoints.min, L.beOffsetPoints.max, base.beOffsetPoints, 0)),
    // شروع تریلینگ بدون فاصله (یا برعکس) بی‌معنیه → هر دو خاموش
    trailingStartR: trailingStartR > 0 && trailingDistR > 0 ? trailingStartR : 0,
    trailingDistR: trailingStartR > 0 && trailingDistR > 0 ? trailingDistR : 0,
  };
}

/** ردیف ذخیره‌شده‌ی دیتابیس (Json) → قوانین معتبر؛ خالی → پیش‌فرض */
export function readStoredRules(raw: unknown): MoneyRules {
  return validateMoneyRules(raw, DEFAULT_MONEY_RULES);
}

// ── لاگ اقدام‌های اکسپرت ────────────────────────────────────────────────────
export type MmEvent = { t: string; action: string; ticket: string; detail: string };

export const MM_EVENTS_PER_SYNC = 20;
export const MM_LOG_MAX = 30;

function clip(v: unknown, max: number): string {
  if (typeof v === "number" && Number.isFinite(v)) v = String(v);
  if (typeof v !== "string") return "";
  // کنترل‌کاراکتر و NUL حذف می‌شه؛ ساختار JSON اکسپرت دستی ساخته می‌شه
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

export function normalizeMmEvents(raw: unknown): MmEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: MmEvent[] = [];
  for (const r of raw) {
    if (out.length >= MM_EVENTS_PER_SYNC) break;
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const action = clip(o.action, 24);
    if (!action) continue;
    out.push({ t: clip(o.t, 32), action, ticket: clip(o.ticket, 20), detail: clip(o.detail, 120) });
  }
  return out;
}

/** لاگ قبلی (Json) + رویدادهای تازه → آخرین ۳۰ مورد، قدیمی‌ترین اول */
export function appendMmLog(prev: unknown, events: MmEvent[]): MmEvent[] {
  const old = normalizeMmEvents(Array.isArray(prev) ? prev.slice(-MM_LOG_MAX) : []);
  return [...old, ...events].slice(-MM_LOG_MAX);
}

/** شکل ارسالی به اکسپرت در پاسخ sync (فقط مقدارهای ساده، بولین‌ها 0/1) */
export function rulesForEa(r: MoneyRules): Record<string, number> {
  return {
    riskPct: r.riskPerTradePct,
    requireSL: r.requireSL ? 1 : 0,
    autoSLPct: r.autoSLPct,
    slGraceSec: r.slGraceSec,
    maxOpen: r.maxOpenTrades,
    maxDaily: r.maxDailyTrades,
    maxLossPct: r.maxDailyLossPct,
    targetPct: r.dailyProfitTargetPct,
    lockOnTarget: r.lockOnTarget ? 1 : 0,
    beR: r.breakEvenAtR,
    beOffset: r.beOffsetPoints,
    trailStartR: r.trailingStartR,
    trailDistR: r.trailingDistR,
  };
}

export const MM_ACTION_LABELS: Record<string, string> = {
  sl_set: "گذاشتن حد ضرر خودکار",
  close_nosl: "بستن پوزیشن بدون حد ضرر",
  partial_risk: "کم‌کردن حجم (ریسک بالا)",
  close_risk: "بستن پوزیشن (ریسک بالا)",
  close_maxopen: "بستن پوزیشن اضافه (سقف باز)",
  close_maxdaily: "بستن پوزیشن اضافه (سقف روزانه)",
  lock_loss: "قفل ضرر روزانه",
  lock_target: "قفل هدف سود روزانه",
  close_locked: "بستن پوزیشن در حالت قفل",
  breakeven: "سر به سر کردن",
  trail: "تریلینگ حد ضرر",
  error: "خطا",
};
