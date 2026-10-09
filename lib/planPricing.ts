import { tr } from "@/lib/i18n";
// قیمت‌گذاری پلن‌ها — منطق خالص و بدون import سروری (هم سمت سرور، هم کلاینت).
//
// منبع واقعی قیمت‌ها از این به بعد پنل ادمین است (/admin/pricing → AppSetting
// با کلید PLAN_PRICING_SETTING_KEY، خواندن سمت سرور در lib/planPricingServer.ts،
// سمت کلاینت با lib/usePlanPricing.ts). DEFAULT_PRICING_CONFIG پایین فقط
// پیش‌فرض کد است: وقتی هنوز چیزی ذخیره نشده یا مقدار ذخیره‌شده خراب است.
//
// واحدها: همه‌ی عددهای این پیکربندی «تومان»اند (برای ادمین خواناتر)؛ مبلغی که
// به درگاه می‌ره ریال است (amountRial = تومان × 10).
//
// «مدت‌ها» چهار جایگاه ثابت دارن ("1" | "3" | "6" | "12") که شناسه‌ی آن‌ها در
// آدرس‌ها (?duration=) می‌آد؛ تعداد ماه واقعی هر جایگاه و روشن/خاموش بودنش
// از همین پیکربندی خوانده می‌شه — یعنی جایگاه "3" می‌تونه مثلا 2 ماهه باشه.

export type Duration = "1" | "3" | "6" | "12";
export const DURATIONS: Duration[] = ["1", "3", "6", "12"];

export const PAID_PLAN_KEYS = ["basic", "exercise", "trade", "max"] as const;
export type PaidPlanKey = (typeof PAID_PLAN_KEYS)[number];

export const PLAN_NAMES_FA: Record<PaidPlanKey, string> = {
  basic: "پلن روتین من",
  exercise: "پلن بدنسازی",
  trade: "پلن ترید",
  max: "پلن مکس",
};

const PLAN_NAMES_EN: Record<PaidPlanKey, string> = {
  basic: "My Routine plan",
  exercise: "Workout plan",
  trade: "Trading plan",
  max: "Max plan",
};

/** اسم پلن به زبان جاری */
export function planNameLabel(key: PaidPlanKey): string {
  return tr(PLAN_NAMES_FA[key], PLAN_NAMES_EN[key]);
}

export const PLAN_PRICING_SETTING_KEY = "plan_pricing";

export type DurationConfig = { months: number; enabled: boolean };
/** price = مبلغ واقعی پرداخت (تومان). original = قیمت خط‌خورده‌ی قبل از تخفیف (تومان)، 0 یعنی بدون تخفیف. */
export type PriceCell = { price: number; original: number };
export type PricingConfig = {
  durations: Record<Duration, DurationConfig>;
  plans: Record<PaidPlanKey, Record<Duration, PriceCell>>;
};

export const PRICING_LIMITS = {
  minPriceToman: 1_000,
  maxPriceToman: 1_000_000_000,
  minMonths: 1,
  maxMonths: 36,
} as const;

// پیش‌فرض کد: ماه × قیمت ماهانه × 0.875 (تخفیف 12.5٪) برای 3/6/12 ماهه، گردشده
// به نزدیک‌ترین هزار تومان؛ قیمت خط‌خورده = ماه × قیمت ماهانه.
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  durations: {
    "1": { months: 1, enabled: true },
    "3": { months: 3, enabled: true },
    "6": { months: 6, enabled: true },
    "12": { months: 12, enabled: true },
  },
  plans: {
    basic: {
      "1": { price: 99_000, original: 0 },
      "3": { price: 260_000, original: 297_000 },
      "6": { price: 520_000, original: 594_000 },
      "12": { price: 1_040_000, original: 1_188_000 },
    },
    exercise: {
      "1": { price: 150_000, original: 0 },
      "3": { price: 394_000, original: 450_000 },
      "6": { price: 788_000, original: 900_000 },
      "12": { price: 1_575_000, original: 1_800_000 },
    },
    trade: {
      "1": { price: 175_000, original: 0 },
      "3": { price: 459_000, original: 525_000 },
      "6": { price: 919_000, original: 1_050_000 },
      "12": { price: 1_838_000, original: 2_100_000 },
    },
    max: {
      "1": { price: 250_000, original: 0 },
      "3": { price: 656_000, original: 750_000 },
      "6": { price: 1_313_000, original: 1_500_000 },
      "12": { price: 2_625_000, original: 3_000_000 },
    },
  },
};

export function isPaidPlanKey(v: unknown): v is PaidPlanKey {
  return typeof v === "string" && (PAID_PLAN_KEYS as readonly string[]).includes(v);
}

export function isDuration(v: unknown): v is Duration {
  return typeof v === "string" && (DURATIONS as string[]).includes(v);
}

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

function validPrice(v: unknown): v is number {
  return isInt(v) && v >= PRICING_LIMITS.minPriceToman && v <= PRICING_LIMITS.maxPriceToman;
}

function validMonths(v: unknown): v is number {
  return isInt(v) && v >= PRICING_LIMITS.minMonths && v <= PRICING_LIMITS.maxMonths;
}

/**
 * اعتبارسنجی سخت‌گیرانه‌ی ورودی پنل ادمین — هر خطا با پیام فارسی رد می‌شه
 * (هیچ مقداری بی‌صدا اصلاح نمی‌شه). خروجی یک کپی تمیز فقط با فیلدهای شناخته‌شده‌ست.
 */
export function validatePricingConfig(input: unknown): { ok: true; config: PricingConfig } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: tr("ورودی نامعتبر است", "Invalid input") };
  const raw = input as { durations?: any; plans?: any };
  if (!raw.durations || typeof raw.durations !== "object") return { ok: false, error: tr("مدت‌ها ارسال نشده", "Durations were not sent") };
  if (!raw.plans || typeof raw.plans !== "object") return { ok: false, error: tr("قیمت پلن‌ها ارسال نشده", "Plan prices were not sent") };

  const durations = {} as Record<Duration, DurationConfig>;
  for (const d of DURATIONS) {
    const dc = raw.durations[d];
    if (!dc || typeof dc !== "object") return { ok: false, error: tr(`مدت ${d} ارسال نشده`, `Duration ${d} was not sent`) };
    if (!validMonths(dc.months)) {
      return { ok: false, error: tr(`تعداد ماه باید عدد صحیح بین ${PRICING_LIMITS.minMonths} و ${PRICING_LIMITS.maxMonths} باشد`, `Months must be a whole number between ${PRICING_LIMITS.minMonths} and ${PRICING_LIMITS.maxMonths}`) };
    }
    if (typeof dc.enabled !== "boolean") return { ok: false, error: tr("وضعیت فعال بودن مدت نامعتبر است", "Invalid enabled state for the duration") };
    durations[d] = { months: dc.months, enabled: dc.enabled };
  }
  if (!DURATIONS.some((d) => durations[d].enabled)) return { ok: false, error: tr("حداقل یک مدت باید فعال باشد", "At least one duration must be enabled") };
  const monthsSeen = new Set<number>();
  for (const d of DURATIONS) {
    if (monthsSeen.has(durations[d].months)) return { ok: false, error: tr("تعداد ماه دو مدت نمی‌تواند یکسان باشد", "Two durations cannot have the same number of months") };
    monthsSeen.add(durations[d].months);
  }

  const plans = {} as Record<PaidPlanKey, Record<Duration, PriceCell>>;
  for (const key of PAID_PLAN_KEYS) {
    const rp = raw.plans[key];
    if (!rp || typeof rp !== "object") return { ok: false, error: tr(`قیمت ${PLAN_NAMES_FA[key]} ارسال نشده`, `The price of ${planNameLabel(key)} was not sent`) };
    const row = {} as Record<Duration, PriceCell>;
    for (const d of DURATIONS) {
      const cell = rp[d];
      if (!cell || typeof cell !== "object") return { ok: false, error: tr(`قیمت ${PLAN_NAMES_FA[key]} ارسال نشده`, `The price of ${planNameLabel(key)} was not sent`) };
      if (!validPrice(cell.price)) {
        return {
          ok: false,
          error: tr(
            `قیمت ${PLAN_NAMES_FA[key]} (${durations[d].months} ماهه) باید عدد صحیح بین ${PRICING_LIMITS.minPriceToman.toLocaleString("en-US")} و ${PRICING_LIMITS.maxPriceToman.toLocaleString("en-US")} تومان باشد`,
            `The price of ${planNameLabel(key)} (${durations[d].months} months) must be a whole number between ${PRICING_LIMITS.minPriceToman.toLocaleString("en-US")} and ${PRICING_LIMITS.maxPriceToman.toLocaleString("en-US")} Toman`,
          ),
        };
      }
      const original = cell.original ?? 0;
      if (!isInt(original) || original < 0 || original > PRICING_LIMITS.maxPriceToman) {
        return { ok: false, error: tr(`قیمت قبل از تخفیف ${PLAN_NAMES_FA[key]} (${durations[d].months} ماهه) نامعتبر است`, `The pre-discount price of ${planNameLabel(key)} (${durations[d].months} months) is invalid`) };
      }
      if (original !== 0 && original < cell.price) {
        return { ok: false, error: tr(`قیمت قبل از تخفیف ${PLAN_NAMES_FA[key]} (${durations[d].months} ماهه) نباید از قیمت نهایی کمتر باشد`, `The pre-discount price of ${planNameLabel(key)} (${durations[d].months} months) must not be lower than the final price`) };
      }
      row[d] = { price: cell.price, original };
    }
    plans[key] = row;
  }
  return { ok: true, config: { durations, plans } };
}

/**
 * نسخه‌ی مقاوم برای مقدار ذخیره‌شده: اگه کل مقدار معتبر بود همون، وگرنه
 * پیش‌فرض کد. عمدا قاطی‌کردن تکه‌ای ذخیره‌شده/پیش‌فرض نمی‌کنیم — یک جدول
 * قیمت نیمه‌پیش‌فرض بی‌صدا از یک خطای آشکار خطرناک‌تره.
 */
export function normalizePricingConfig(input: unknown): PricingConfig {
  if (input == null) return DEFAULT_PRICING_CONFIG;
  const v = validatePricingConfig(input);
  return v.ok ? v.config : DEFAULT_PRICING_CONFIG;
}

export function enabledDurations(cfg: PricingConfig): Duration[] {
  return DURATIONS.filter((d) => cfg.durations[d].enabled);
}

export function durationMonths(cfg: PricingConfig, d: Duration): number {
  return cfg.durations[d].months;
}

export function durationLabel(cfg: PricingConfig, d: Duration): string {
  const m = cfg.durations[d].months;
  return tr(`${m} ماهه`, `${m} ${m === 1 ? "month" : "months"}`);
}

/** درصد تخفیف نمایشی یک خانه (یک رقم اعشار)، 0 اگه قیمت خط‌خورده نداره */
export function discountPercentOf(cell: PriceCell): number {
  if (!cell.original || cell.original <= cell.price) return 0;
  return Math.round((1 - cell.price / cell.original) * 1000) / 10;
}

/** قیمت نهایی از قیمت قبل از تخفیف و درصد تخفیف، گردشده به نزدیک‌ترین هزار تومان */
export function priceFromDiscount(original: number, percent: number): number {
  const p = Math.max(0, Math.min(100, percent));
  return Math.round((original * (100 - p)) / 100 / 1000) * 1000;
}

export function formatToman(toman: number): string {
  return tr(`${Math.round(toman).toLocaleString("en-US")} تومان`, `${Math.round(toman).toLocaleString("en-US")} Toman`);
}

/** «99 هزار تومان» برای متن‌های توضیحی؛ اگه رند هزار نبود عدد کامل */
export function formatTomanShort(toman: number): string {
  return toman % 1000 === 0 ? tr(`${(toman / 1000).toLocaleString("en-US")} هزار تومان`, `${Math.round(toman).toLocaleString("en-US")} Toman`) : formatToman(toman);
}

/**
 * قیمت «ماهانه»ی یک پلن برای متن‌های توضیحی: خانه‌ی مدتی که دقیقا 1 ماهه‌ست
 * (حتی اگه خاموش باشه، چون متن‌ها «ماهانه» می‌گن)، وگرنه ارزان‌ترین مدت فعال
 * تقسیم بر تعداد ماه.
 */
export function monthlyPriceToman(cfg: PricingConfig, plan: PaidPlanKey): number {
  const one = DURATIONS.find((d) => cfg.durations[d].months === 1);
  if (one) return cfg.plans[plan][one].price;
  const ds = enabledDurations(cfg);
  return Math.min(...ds.map((d) => Math.round(cfg.plans[plan][d].price / cfg.durations[d].months)));
}

export type PlanPricing = {
  key: PaidPlanKey;
  nameFa: string;
  // مبلغ خام هر مدت به ریال (واحد درگاه)
  amounts: Record<Duration, number>;
};

/** نمای سازگار با قبل: مبلغ ریالی هر مدت یک پلن از روی پیکربندی (پیش‌فرض: پیش‌فرض کد) */
export function findPlanPricing(key: string, cfg: PricingConfig = DEFAULT_PRICING_CONFIG): PlanPricing | undefined {
  if (!isPaidPlanKey(key)) return undefined;
  const amounts = {} as Record<Duration, number>;
  for (const d of DURATIONS) amounts[d] = cfg.plans[key][d].price * 10;
  return { key, nameFa: PLAN_NAMES_FA[key], amounts };
}

/** مبلغ ریالی یک پلن/مدت، فقط اگه آن مدت فعال باشه */
export function chargeAmountRial(cfg: PricingConfig, key: string, d: string): number | null {
  if (!isPaidPlanKey(key) || !isDuration(d) || !cfg.durations[d].enabled) return null;
  return cfg.plans[key][d].price * 10;
}

/**
 * پیشنهاد «شروع» یک پلن برای دکمه‌های خرید تکی (بنر تریال، گیت ماژول):
 * مدت یک‌ماهه اگه فعاله، وگرنه اولین مدت فعال. label مثلا «ماهانه 99,000 تومان».
 */
export function entryOffer(cfg: PricingConfig, plan: PaidPlanKey): { duration: Duration; months: number; price: number; label: string } {
  const ds = enabledDurations(cfg);
  const duration = ds.find((d) => cfg.durations[d].months === 1) ?? ds[0];
  const months = cfg.durations[duration].months;
  const price = cfg.plans[plan][duration].price;
  return { duration, months, price, label: `${months === 1 ? tr("ماهانه", "Monthly") : tr(`${months} ماهه`, `${months} months`)} ${formatToman(price)}` };
}

// متن‌های ثابت توضیحی (FAQ، صفحه‌های سئو، llms.txt، متن تریال) به‌جای عدد
// هاردکد این نشانه رو دارن و موقع نمایش با fillPriceCopy از پیکربندی فعلی پر
// می‌شن — تا با تغییر قیمت از پنل، هیچ متنی قیمت قدیمی رو نگه نداره.
export const ROUTINE_MONTHLY_TOKEN = "{{routine_monthly}}";

/** مثلا «ماهانه 99 هزار تومان» */
export function routineMonthlyCopyFa(cfg: PricingConfig): string {
  return tr(`ماهانه ${formatTomanShort(monthlyPriceToman(cfg, "basic"))}`, `${formatTomanShort(monthlyPriceToman(cfg, "basic"))} per month`);
}

/** همه‌ی رشته‌های داخل value (رشته/آرایه/آبجکت ساده) با نشانه‌های قیمت پر می‌شن */
export function fillPriceCopy<T>(value: T, cfg: PricingConfig): T {
  const monthly = routineMonthlyCopyFa(cfg);
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.split(ROUTINE_MONTHLY_TOKEN).join(monthly);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return walk(value) as T;
}
