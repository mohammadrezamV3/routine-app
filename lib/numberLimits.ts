// تک‌منبع حقیقت سقف و کف همه‌ی عددهایی که کاربر تایپ می‌کنه.
//
// چرا هست: قبلا فقط بعضی فیلدها سقف داشتن و هرکدوم عدد خودش رو داشت (قد توی
// پروفایل 100..250 و توی کالری 50..260 بود). نتیجه: کاربری ده میلیارد کالری
// ثبت کرد و جمع روز، نمودارها و داشبورد همه با اون عدد منفجر شدن. حالا:
//   - سرور (روت‌های API) هر عدد رو با همین جدول می‌سنجه و خطای 400 می‌ده؛
//   - کلاینت (NumberInput با prop `limit`) همین جدول رو برای سقف تایپ،
//     تعداد رقم و اعشار و علامت خطا می‌خونه؛
//   - جمع‌هایی که نمایش داده می‌شن با clampDisplay کنترل می‌شن تا داده‌ی
//     قدیمی خراب هم چیزی رو نشکنه.
// مقدارها سخاوتمندانه ولی عاقلانه‌ان: هدف جلوگیری از اشتباه تایپی و سوءاستفاده‌ست،
// نه محدود کردن استفاده‌ی واقعی. هر تغییری اینجا هم سرور هم کلاینت رو عوض می‌کنه.
//
// متن‌ها با tr() و داخل توابع ساخته می‌شن (نه در سطح ماژول) تا زبان درست باشه.

import { tr } from "./i18n";

export type NumberLimit = {
  readonly min: number;
  readonly max: number;
  /** 0 = عدد صحیح؛ بیشتر از 0 = حداکثر تعداد رقم اعشار */
  readonly decimals: number;
  /** نام فیلد برای پیام خطا */
  readonly fa: string;
  readonly en: string;
};

function L(min: number, max: number, decimals: number, fa: string, en: string): NumberLimit {
  return { min, max, decimals, fa, en };
}

export const NUMBER_LIMITS = {
  // ── کالری و تغذیه ──────────────────────────────────────────────────────
  /** مقدار تایپ‌شده‌ی غذا در واحد انتخابی (گرم/میلی‌لیتر/قاشق/پیمانه) */
  foodAmount: L(0.1, 5000, 2, "مقدار غذا", "Food amount"),
  /** وزن کل یک ثبت غذا بعد از تبدیل واحد (گرم) */
  foodGrams: L(0.1, 10000, 2, "وزن غذا", "Food weight"),
  /** کالری هر 100 گرم برای غذای دستی (خالص‌ترین چربی حدود 900 است) */
  caloriesPer100g: L(0.1, 1000, 2, "کالری هر 100 گرم", "Calories per 100 g"),
  /** کالری کل یک ثبت غذا */
  entryKcal: L(0, 10000, 2, "کالری غذا", "Food calories"),
  /** پروتئین/کربوهیدرات/چربی یک ثبت غذا (گرم) */
  macroEntryG: L(0, 1000, 1, "مقدار درشت‌مغذی", "Macronutrient amount"),
  /** هدف روزانه‌ی هر درشت‌مغذی (گرم) */
  macroTargetG: L(0, 2000, 0, "هدف درشت‌مغذی", "Macronutrient goal"),
  /** کالری یک وعده در هدف روزانه */
  mealKcal: L(0, 10000, 0, "کالری وعده", "Meal calories"),
  /** جمع هدف کالری روزانه (جمع وعده‌ها یا محاسبه‌ی خودکار) */
  dailyTargetKcal: L(800, 10000, 0, "هدف کالری روزانه", "Daily calorie goal"),
  /** تعداد وعده‌ی روزانه در محاسبه‌ی خودکار */
  mealsPerDay: L(2, 6, 0, "تعداد وعده", "Number of meals"),
  /** تعداد وعده‌ی ویرایش دستی */
  mealCount: L(1, 8, 0, "تعداد وعده", "Number of meals"),
  /** سقف نمایش جمع کالری یک روز (فقط برای داده‌ی قدیمی خراب؛ ورودی نیست) */
  dailyKcalDisplay: L(0, 30000, 0, "جمع کالری روز", "Daily calorie total"),

  // ── مشخصات بدن (پروفایل، کالری، ورزش، BMI) ─────────────────────────────
  ageYears: L(10, 120, 0, "سن", "Age"),
  heightCm: L(50, 260, 0, "قد", "Height"),
  weightKg: L(20, 400, 1, "وزن", "Weight"),

  // ── ورزش ───────────────────────────────────────────────────────────────
  /** چندمین ماه تمرین */
  trainingMonth: L(1, 600, 0, "ماه تمرین", "Training month"),
  sets: L(1, 100, 0, "تعداد ست", "Number of sets"),
  reps: L(1, 1000, 0, "تعداد تکرار", "Number of reps"),
  /** مدت یک حرکت زمانی وقتی واحد ثانیه است */
  exerciseSeconds: L(1, 7200, 0, "مدت حرکت (ثانیه)", "Exercise duration (seconds)"),
  /** مدت یک حرکت زمانی وقتی واحد دقیقه است */
  exerciseMinutes: L(1, 600, 0, "مدت حرکت (دقیقه)", "Exercise duration (minutes)"),
  /** وزنه (کیلوگرم) */
  liftedWeightKg: L(0, 1000, 1, "وزنه", "Lifted weight"),
  restSec: L(0, 3600, 0, "استراحت", "Rest"),
  /** مدت آیتم برنامه‌ی منتور (دقیقه) */
  durationMin: L(1, 1440, 0, "مدت", "Duration"),

  // ── خواب ───────────────────────────────────────────────────────────────
  /** زمان به خواب رفتن (دقیقه) */
  sleepLatency: L(0, 240, 0, "زمان به خواب رفتن", "Time to fall asleep"),
  sleepAwakenings: L(0, 20, 0, "تعداد بیداری", "Number of awakenings"),
  sleepNap: L(0, 240, 0, "چرت", "Nap"),
  /** مدت یک خواب شبانه (دقیقه) */
  sleepDuration: L(30, 1200, 0, "مدت خواب", "Sleep duration"),
  sleepQuality: L(1, 5, 0, "کیفیت خواب", "Sleep quality"),

  // ── ترید ───────────────────────────────────────────────────────────────
  /** حجم معامله به لات (کوچک‌ترین گام رایج 0.00001 کریپتو است) */
  tradeVolumeLot: L(0.00001, 100000, 5, "حجم معامله", "Trade volume"),
  /** حجم معامله وقتی واحد دلار است */
  tradeVolumeUsd: L(0.01, 1e9, 2, "حجم معامله", "Trade volume"),
  /** قیمت ورود/خروج/حد ضرر/حد سود؛ صفر یعنی «ندارد» */
  tradePrice: L(0, 1e7, 8, "قیمت", "Price"),
  /** سود/زیان یک معامله (علامت‌دار) */
  tradePnl: L(-1e9, 1e9, 2, "سود/زیان", "Profit/loss"),
  /** کمیسیون و سواپ یک معامله (علامت‌دار) */
  tradeFee: L(-1e7, 1e7, 2, "هزینه معامله", "Trade fee"),
  tradeRisk: L(0, 1e9, 2, "مقدار ریسک", "Risk amount"),
  tradeConfidence: L(1, 10, 0, "میزان اطمینان", "Confidence"),
  /** بالانس اولیه‌ی حساب و موجودی ماشین‌حساب */
  accountBalance: L(0, 1e10, 2, "موجودی حساب", "Account balance"),
  /** یک واریز/برداشت/هزینه‌ی حساب (علامت‌دار، فقط داده‌ی اکسپرت متاتریدر) */
  cashflowAmount: L(-1e10, 1e10, 2, "مبلغ تراکنش", "Transaction amount"),
  goalAmount: L(0, 1e10, 2, "مقدار هدف", "Goal amount"),
  goalPercent: L(0, 10000, 2, "درصد هدف", "Goal percent"),
  leverage: L(1, 10000, 0, "اهرم", "Leverage"),
  /** درصد ریسک در ماشین‌حساب ریسک */
  riskPercent: L(0.01, 100, 2, "درصد ریسک", "Risk percent"),
  /** تعداد پیپ/پوینت در ماشین‌حساب ریسک */
  pips: L(0.1, 100000, 2, "تعداد پیپ", "Number of pips"),
  /** نرخ تبدیل ارز دوم به دلار (مثلا ین 0.0067) */
  quoteRate: L(0.000001, 1000000, 8, "نرخ ارز", "Currency rate"),

  // ── روتین و دارو ───────────────────────────────────────────────────────
  /** طول دوره‌ی دارو (روز) */
  medicationDays: L(1, 365, 0, "طول دوره", "Course length"),
  /** تعداد نوبت دارو در روز */
  medicationTimes: L(1, 12, 0, "تعداد نوبت در روز", "Doses per day"),
  /** تعداد آیتم یک برنامه‌ی لیستی (رابط 30 تا می‌ده؛ این سقف سمت سرور بازتره) */
  routineItems: L(1, 100, 0, "تعداد آیتم", "Number of items"),
  /** تعداد برنامه‌های سفارشی یک کاربر در تنظیمات */
  routineOccurrences: L(0, 2000, 0, "تعداد برنامه", "Number of programs"),

  // ── ادمین ──────────────────────────────────────────────────────────────
  /** حداکثر مصرف کد تخفیف برای هر کاربر */
  discountMaxUses: L(1, 1000000, 0, "حداکثر مصرف", "Max uses"),
} as const satisfies Record<string, NumberLimit>;

export type LimitKey = keyof typeof NUMBER_LIMITS;
export type LimitSpec = LimitKey | NumberLimit;

/** حداکثر آیتم یک روز برنامه‌ی تمرینی دستی و تعداد روزهای برنامه */
export const MAX_EXERCISE_ITEMS_PER_DAY = 60;
/** حداکثر طول متن ورودی عددی (برای رشته‌هایی که قبل از تبدیل به عدد می‌رسن) */
export const MAX_NUMERIC_TEXT_LEN = 24;

export function limitOf(spec: LimitSpec): NumberLimit {
  return typeof spec === "string" ? NUMBER_LIMITS[spec] : spec;
}

function fmt(n: number): string {
  // ارقام لاتین (قانون سایت)؛ بدون نماد علمی برای مقدارهای بزرگ
  return n.toLocaleString("en-US", { maximumFractionDigits: 8, useGrouping: true });
}

/** «50 تا 260» برای نمایش در پیام و راهنما */
export function limitRangeText(spec: LimitSpec): string {
  const l = limitOf(spec);
  return tr(`${fmt(l.min)} تا ${fmt(l.max)}`, `${fmt(l.min)} to ${fmt(l.max)}`);
}

/** پیام خطای استاندارد: «قد باید بین 50 تا 260 باشد» */
export function limitError(spec: LimitSpec): string {
  const l = limitOf(spec);
  const isInt = l.decimals === 0;
  return tr(
    `${l.fa} باید ${isInt ? "عدد صحیحی " : ""}بین ${fmt(l.min)} تا ${fmt(l.max)} باشد`,
    `${l.en} must be ${isInt ? "a whole number " : "a number "}between ${fmt(l.min)} and ${fmt(l.max)}`
  );
}

export function roundTo(v: number, decimals: number): number {
  if (decimals <= 0) return Math.round(v);
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

export function hasNumberValue(v: unknown): boolean {
  return !(v === undefined || v === null || (typeof v === "string" && v.trim() === ""));
}

export type NumberCheck = { ok: true; value: number } | { ok: false; error: string };
export type OptionalNumberCheck = { ok: true; value: number | null } | { ok: false; error: string };

/**
 * عدد ورودی (بدنه‌ی JSON) رو با سقف/کف جدول می‌سنجه.
 * - فقط عدد متناهی (NaN و Infinity رد می‌شن)؛ `coerceString` رشته‌ی عددی رو هم
 *   می‌پذیره (ارقام فارسی/عربی تبدیل می‌شن).
 * - فیلد صحیح (decimals = 0) با اعشار رد می‌شه؛ فیلد اعشاری بیش از حد مجاز
 *   گرد می‌شه (72.55 → 72.6) چون معنی کاربر روشنه.
 */
export function checkNumber(v: unknown, spec: LimitSpec, opts: { coerceString?: boolean } = {}): NumberCheck {
  const l = limitOf(spec);
  let n: number;
  if (typeof v === "number") n = v;
  else if (opts.coerceString && typeof v === "string" && v.trim() !== "" && v.length <= MAX_NUMERIC_TEXT_LEN) {
    n = Number(toLatinDigits(v).trim().replace(/[٫،]/g, "."));
  } else return { ok: false, error: limitError(l) };
  if (!Number.isFinite(n)) return { ok: false, error: limitError(l) };
  if (l.decimals === 0 && !Number.isInteger(n)) return { ok: false, error: limitError(l) };
  const r = roundTo(n, l.decimals);
  if (r < l.min || r > l.max) return { ok: false, error: limitError(l) };
  return { ok: true, value: r };
}

/** مثل checkNumber ولی خالی/null/undefined یعنی «ندارد» و null برمی‌گرده */
export function checkOptionalNumber(v: unknown, spec: LimitSpec, opts: { coerceString?: boolean } = {}): OptionalNumberCheck {
  if (!hasNumberValue(v)) return { ok: true, value: null };
  return checkNumber(v, spec, opts);
}

/** آیا v یک عدد متناهی توی بازه‌ی جدوله؟ (بدون گرد کردن) */
export function isInLimit(v: unknown, spec: LimitSpec): v is number {
  const l = limitOf(spec);
  return typeof v === "number" && Number.isFinite(v) && v >= l.min && v <= l.max && (l.decimals > 0 || Number.isInteger(v));
}

/** فقط بازه (بدون چک صحیح‌بودن) — برای داده‌ی خارجی مثل اکسپرت متاتریدر */
export function inLimitRange(v: number | null, spec: LimitSpec): v is number {
  const l = limitOf(spec);
  return v !== null && Number.isFinite(v) && v >= l.min && v <= l.max;
}

/** گیره‌ی ساده به بازه (و گرد به اعشار مجاز)؛ NaN/غیرعدد → min */
export function clampToLimit(v: unknown, spec: LimitSpec): number {
  const l = limitOf(spec);
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return l.min;
  return roundTo(Math.min(l.max, Math.max(l.min, n)), l.decimals);
}

/**
 * برای نمایش: داده‌ی قدیمی خارج از بازه یا خراب (NaN، Infinity، منفی، ده میلیارد)
 * جمع‌ها و نمودارها رو منفجر نکنه. بدون گرد کردن اعشار (فقط گیره).
 */
export function clampDisplay(v: unknown, spec: LimitSpec): number {
  const l = limitOf(spec);
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0 < l.min ? l.min : 0;
  return Math.min(l.max, Math.max(l.min < 0 ? l.min : 0, n));
}

// ── سمت ورودی (تایپ کاربر) ─────────────────────────────────────────────────

function toLatinDigits(s: string): string {
  return s
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** سقف تعداد نویسه‌ی فیلد: رقم‌های بخش صحیح + نقطه + اعشار (+ علامت منفی) */
export function maxInputChars(spec: LimitSpec): number {
  const l = limitOf(spec);
  const intDigits = String(Math.floor(Math.max(Math.abs(l.max), Math.abs(l.min)))).length;
  return intDigits + (l.decimals > 0 ? l.decimals + 1 : 0) + (l.min < 0 ? 1 : 0);
}

export type TypedResult = { text: string; clamped: boolean };

/**
 * متن تایپ‌شده‌ی عددی (که قبلا sanitizeNumeric پاکش کرده: فقط رقم لاتین و حداکثر
 * یک نقطه) رو با جدول تطبیق می‌ده: رقم اعشار اضافه بریده می‌شه، صفرهای ابتدایی
 * حذف می‌شن و مقدار بالاتر از سقف روی سقف می‌شینه (`clamped`). کف اینجا اعمال
 * نمی‌شه چون وسط تایپ («5» برای «50») نباید مزاحم بشه؛ کف موقع blur/ثبت چک می‌شه.
 */
export function constrainTyped(text: string, spec: LimitSpec, bounds: { max?: number } = {}): TypedResult {
  const l = limitOf(spec);
  const max = bounds.max ?? l.max;
  let t = toLatinDigits(text);
  if (l.decimals === 0) t = t.replace(/\..*$/, "");
  else {
    const dot = t.indexOf(".");
    if (dot !== -1) t = t.slice(0, dot + 1 + l.decimals);
  }
  t = t.replace(/^0+(?=\d)/, "");
  if (t === "" || t === ".") return { text: t, clamped: false };
  const n = Number(t);
  if (Number.isFinite(n) && n > max) {
    return { text: String(roundTo(max, l.decimals)), clamped: true };
  }
  return { text: t, clamped: false };
}

/** متن تایپ‌شده → عدد یا null (خالی/نامعتبر) */
export function parseTyped(text: string): number | null {
  const t = toLatinDigits(String(text ?? "")).trim().replace(/[٫،]/g, ".");
  if (t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type TypedStatus = "empty" | "ok" | "low" | "high";

/** وضعیت متن تایپ‌شده نسبت به جدول (برای علامت خطا و اعتبارسنجی فرم) */
export function typedStatus(text: string, spec: LimitSpec, bounds: { min?: number; max?: number } = {}): TypedStatus {
  const l = limitOf(spec);
  const n = parseTyped(text);
  if (n === null) return "empty";
  if (n < (bounds.min ?? l.min)) return "low";
  if (n > (bounds.max ?? l.max)) return "high";
  return "ok";
}

/**
 * اعتبارسنجی یک فیلد فرم از متن تایپ‌شده. خالی = null (مقدار اختیاری یا
 * اجباری‌بودن رو خود فرم تصمیم می‌گیره). برگشتی: عدد معتبر، یا پیام خطا.
 */
export function readTyped(text: string, spec: LimitSpec, bounds: { min?: number; max?: number } = {}):
  { ok: true; value: number | null } | { ok: false; error: string } {
  const st = typedStatus(text, spec, bounds);
  if (st === "empty") return { ok: true, value: null };
  if (st !== "ok") return { ok: false, error: limitError({ ...limitOf(spec), min: bounds.min ?? limitOf(spec).min, max: bounds.max ?? limitOf(spec).max }) };
  const l = limitOf(spec);
  const n = parseTyped(text) as number;
  if (l.decimals === 0 && !Number.isInteger(n)) return { ok: false, error: limitError(l) };
  return { ok: true, value: roundTo(n, l.decimals) };
}
