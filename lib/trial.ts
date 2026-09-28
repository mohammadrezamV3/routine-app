import type { AiFeatureKey } from "@prisma/client";

// دوره‌ی آزمایشیِ حسابِ تازه — منبعِ واحدِ همه‌ی عددهای «تریال».
//
// تصمیمِ Owner: هر حسابِ تازه (ثبت‌نامِ معمولی و ورودِ اول با گوگل، هر دو)
// لحظه‌ی ساخت یک هفته به *همه‌ی* بخش‌ها دسترسی می‌گیرد، ولی استفاده از
// هوش مصنوعی در همین یک هفته سقفِ کم دارد. بعد از یک هفته ماژول‌های پولی
// مثلِ هر ModuleAccess دیگری خودشان منقضی می‌شوند (requireModule/ModuleGate
// همان expiresAt را می‌خوانند) — هیچ کرانی لازم نیست.
//
// این فایل عمداً prisma (جز import type) وارد نمی‌کند تا متن/عددهایش سمتِ
// کلاینت هم قابلِ استفاده باشد؛ بخشِ سرور در lib/trialAccess.ts و lib/aiQuota.ts است.

/** طولِ دوره‌ی آزمایشیِ همه‌ی بخش‌ها (روز) */
export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

/**
 * ماژول‌های پایه (BASIC_MODULES) پیش از این تغییر با انقضای ۱۴روزه ساخته
 * می‌شدند؛ همان رفتار دست‌نخورده می‌ماند (دادهٔ روتین/خواب/کارها اصلاً با
 * ModuleAccess گیت نمی‌شود — این انقضا فقط روی دستیارِ «نومو» اثر دارد).
 */
export const BASIC_ACCESS_DAYS = 14;

/** متنِ واحدِ معرفیِ دوره‌ی آزمایشی در همه‌ی صفحه‌ها */
export const TRIAL_COPY_FA = "یک هفته دسترسیِ کامل به همه‌ی بخش‌ها، با استفاده‌ی محدود از هوش مصنوعی";

/**
 * سقفِ *کلِ* استفاده از هر فیچرِ AI در کلِ دوره‌ی آزمایشی (نه ماهانه/روزانه).
 * Owner می‌تواند از پنلِ ادمین (تنظیمات) عوضشان کند — AppSetting با کلیدِ
 * TRIAL_AI_LIMITS_SETTING_KEY؛ این‌ها فقط پیش‌فرض‌اند. عددِ ۰ یعنی آن فیچر
 * در تریال بسته است.
 *
 * دستیارِ «نومو» (ROUTINE_ASSISTANT) این‌جا نیست: برای هر کاربرِ بی‌اشتراک
 * (از جمله تریال) از قبل سقفِ مادام‌العمرِ FREE_ASSISTANT_USES
 * (lib/routineAssistant.ts، ۳ بار) دارد.
 */
export const DEFAULT_TRIAL_AI_LIMITS = {
  ROADMAP_GENERATION: 3, // ساختِ رودمپ + بازسازیِ راهنما/یک مرحله، روی هم
  EXERCISE_PLAN_GENERATION: 2,
  FOOD_SCAN: 7,
  WEEKLY_COACH_REPORT: 2, // مربیِ AI در آنالیزِ هفتگی
} satisfies Partial<Record<AiFeatureKey, number>>;

export type TrialAiFeature = keyof typeof DEFAULT_TRIAL_AI_LIMITS;
export type TrialAiLimits = Record<TrialAiFeature, number>;
export const TRIAL_AI_FEATURES = Object.keys(DEFAULT_TRIAL_AI_LIMITS) as TrialAiFeature[];

export const TRIAL_AI_FEATURE_LABELS_FA: Record<TrialAiFeature, string> = {
  ROADMAP_GENERATION: "ساخت/بازسازی رودمپ",
  EXERCISE_PLAN_GENERATION: "ساخت برنامه‌ی تمرینی",
  FOOD_SCAN: "اسکن غذا",
  WEEKLY_COACH_REPORT: "مربی AI آنالیز هفتگی",
};

export const TRIAL_AI_LIMITS_SETTING_KEY = "trial_ai_limits";
export const MAX_TRIAL_AI_LIMIT = 1000;

/** ادغامِ مقدارِ ذخیره‌شده با پیش‌فرض‌ها — هر کلیدِ نامعتبر همان پیش‌فرض می‌ماند */
export function normalizeTrialAiLimits(raw: unknown): TrialAiLimits {
  const out = { ...DEFAULT_TRIAL_AI_LIMITS } as TrialAiLimits;
  if (!raw || typeof raw !== "object") return out;
  for (const f of TRIAL_AI_FEATURES) {
    const v = (raw as Record<string, unknown>)[f];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_TRIAL_AI_LIMIT) out[f] = v;
  }
  return out;
}
