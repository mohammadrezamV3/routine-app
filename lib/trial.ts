import type { AiFeatureKey } from "@prisma/client";
import { tr } from "./i18n";

// دوره‌ی آزمایشی حساب تازه — منبع واحد همه‌ی عددهای «تریال».
//
// تصمیم Owner: هر حساب تازه (ثبت‌نام معمولی و ورود اول با گوگل، هر دو)
// لحظه‌ی ساخت TRIAL_DAYS (۷) روز به بدنسازی، کالری‌شمار و ژورنال ترید (TRIAL_MODULES)
// دسترسی می‌گیرد، با سقف کم برای هوش مصنوعی. رودمپ و تحلیل هوشمند
// (AI_INSIGHT) عمدا در تریال نیستند. بعد از اون این ماژول‌ها مثل هر
// ModuleAccess دیگری خودشان منقضی می‌شوند — هیچ کرانی لازم نیست.
//
// ماژول‌های «روتین من» (BASIC_MODULES: روتین/خواب/کارها) دیگه رایگان دائمی
// نیستن: ROUTINE_TRIAL_DAYS روز آزمایشی، بعد پلن «روتین من». دستیار «نومو»:
// اشتراک فعال → نامحدود، بی‌اشتراک → FREE_ASSISTANT_USES پیام رایگان (پیش‌فرض ۱۰).
//
// این فایل عمدا prisma (جز import type) وارد نمی‌کند تا متن/عددهایش سمت
// کلاینت هم قابل استفاده باشد؛ بخش سرور در lib/trialAccess.ts و lib/aiQuota.ts است.

/** طول دوره‌ی آزمایشی (روز) */
export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

/**
 * حساب‌هایی که قبل از این لحظه ساخته شدن، طول تریال قبلی خودشون (۳ و ۱۴ روز)
 * رو نگه می‌دارن؛ تریال ۷ روزه فقط برای حساب‌های بعد از اینه. (تغییر طول تریال
 * هیچ‌وقت وسط تریال کسی دسترسی کم یا زیاد نمی‌کنه.)
 */
export const TRIAL_CUTOFF_AT = new Date("2026-11-28T00:00:00Z");
export const LEGACY_TRIAL_DAYS = 3;
export const LEGACY_ROUTINE_TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** طول تریال ماژول‌های ورزش/کالری/ترید برای حسابی که در createdAt ساخته شده */
export function trialMsFor(createdAt: Date | string | number): number {
  return new Date(createdAt).getTime() < TRIAL_CUTOFF_AT.getTime() ? LEGACY_TRIAL_DAYS * DAY_MS : TRIAL_MS;
}
/** طول تریال «روتین من» برای حسابی که در createdAt ساخته شده */
export function routineTrialMsFor(createdAt: Date | string | number): number {
  return new Date(createdAt).getTime() < TRIAL_CUTOFF_AT.getTime() ? LEGACY_ROUTINE_TRIAL_DAYS * DAY_MS : ROUTINE_TRIAL_MS;
}

/** ماژول‌هایی که در دوره‌ی آزمایشی باز می‌شوند (رشته، تا فایل کلاینت‌پسند بماند) */
export const TRIAL_MODULE_KEYS = ["EXERCISE", "CALORIE", "TRADE"] as const;

/** متن واحد معرفی دوره‌ی آزمایشی در همه‌ی صفحه‌ها */
export const TRIAL_COPY_FA = `${TRIAL_DAYS} روز دسترسی به بدنسازی، کالری‌شمار و ژورنال ترید، با استفاده‌ی محدود از هوش مصنوعی`;
/**
 * «روتین من» (روتین/خواب/کارها — BASIC_MODULES): ROUTINE_TRIAL_DAYS روز آزمایشی برای هر حساب
 * تازه، بعدش پلن «روتین من» (قیمت از پنل ادمین، lib/planPricing.ts) یا هر پلن پولی دیگه.
 */
export const ROUTINE_TRIAL_DAYS = 7;
export const ROUTINE_TRIAL_MS = ROUTINE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
export const ROUTINE_PLAN_KEY = "basic";

/** متن واحد «روتین من» کنار متن تریال — نشانه‌ی قیمت با fillPriceCopy (lib/planPricing.ts) پر می‌شه */
export const FREE_ROUTINE_COPY_FA = `«روتین من» ${ROUTINE_TRIAL_DAYS} روز رایگان است و بعد با پلن «روتین من» ({{routine_monthly}}) ادامه پیدا می‌کند؛ دستیار هوشمند «نومو» 10 پیام رایگان دارد و در پلن‌های «روتین من» و مکس نامحدود است.`;

/**
 * سقف *کل* استفاده از هر فیچر AI در کل دوره‌ی آزمایشی (نه ماهانه/روزانه).
 * Owner می‌تواند از پنل ادمین (تنظیمات) عوضشان کند — AppSetting با کلید
 * TRIAL_AI_LIMITS_SETTING_KEY؛ این‌ها فقط پیش‌فرض‌اند. عدد ۰ یعنی آن فیچر
 * در تریال بسته است.
 *
 * دستیار «نومو» (ROUTINE_ASSISTANT) این‌جا نیست: هر کاربر بی‌اشتراک (تریال
 * یا نه) سقف FREE_ASSISTANT_USES (lib/routineAssistant.ts، پیش‌فرض ۱۰) را دارد. رودمپ و
 * آنالیز هفتگی هم نیستند چون اصلا در تریال باز نمی‌شوند.
 */
export const DEFAULT_TRIAL_AI_LIMITS = {
  EXERCISE_PLAN_GENERATION: 1,
} satisfies Partial<Record<AiFeatureKey, number>>;

export type TrialAiFeature = keyof typeof DEFAULT_TRIAL_AI_LIMITS;
export type TrialAiLimits = Record<TrialAiFeature, number>;
export const TRIAL_AI_FEATURES = Object.keys(DEFAULT_TRIAL_AI_LIMITS) as TrialAiFeature[];

export const TRIAL_AI_FEATURE_LABELS_FA: Record<TrialAiFeature, string> = {
  // getter: زبان موقع خواندن (رندر) انتخاب می‌شه، نه موقع بارگذاری ماژول
  get EXERCISE_PLAN_GENERATION() { return tr("ساخت برنامه‌ی تمرینی", "Workout plan generation"); },
};

export const TRIAL_AI_LIMITS_SETTING_KEY = "trial_ai_limits";
export const MAX_TRIAL_AI_LIMIT = 1000;

/** ادغام مقدار ذخیره‌شده با پیش‌فرض‌ها — هر کلید نامعتبر همان پیش‌فرض می‌ماند */
export function normalizeTrialAiLimits(raw: unknown): TrialAiLimits {
  const out = { ...DEFAULT_TRIAL_AI_LIMITS } as TrialAiLimits;
  if (!raw || typeof raw !== "object") return out;
  for (const f of TRIAL_AI_FEATURES) {
    const v = (raw as Record<string, unknown>)[f];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_TRIAL_AI_LIMIT) out[f] = v;
  }
  return out;
}
