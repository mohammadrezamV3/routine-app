// تخفیف خودکار مناسبت‌ها — منطق خالص (بدون prisma/DOM). [قرارداد — پیاده‌سازی و تست با ایجنت A]
//
// برای هر وقوع هر مناسبت کاتالوگ (lib/eventThemes.ts) یک کد تخفیف عمومی
// (DiscountCode) با درصد state.percent (پیش‌فرض 15) خودکار ساخته می‌شه:
//   - فقط وقتی امروز (تهران) داخل بازه‌ی همون وقوعه، و تا آخر روز end معتبره؛
//   - هر وقوع حداکثر یک بار: کلیدش در generated ثبت می‌شه و اگه ادمین کد رو
//     حذف یا قطع کرد، دیگه دوباره ساخته/روشن نمی‌شه؛
//   - enabled خاموش = هیچ کد تازه‌ای ساخته نمی‌شه (کدهای موجود دست نمی‌خورن).
// وضعیت در AppSetting با کلید EVENT_DISCOUNT_KEY.

import type { EventOccurrence, EventTheme } from "./eventThemes";

export const EVENT_DISCOUNT_KEY = "event_discounts";
export const EVENT_DISCOUNT_PERCENT = 15;

export type EventDiscountState = {
  enabled: boolean;
  /** درصد تخفیف کدهای تازه، عدد صحیح 1 تا 100 */
  percent: number;
  /** occurrenceKey → کدی که یک بار خودکار ساخته شده */
  generated: Record<string, string>;
};

export const DEFAULT_EVENT_DISCOUNT_STATE: EventDiscountState = {
  enabled: true,
  percent: EVENT_DISCOUNT_PERCENT,
  generated: {},
};

/** پیشوند کد هر مناسبت؛ کد = پیشوند + سال شمسی شروع وقوع (مثلا NOWRUZ1406) */
export const EVENT_CODE_PREFIX: Record<string, string> = {
  mehregan: "MEHREGAN",
  halloween: "HALLOWEEN",
  yalda: "YALDA",
  christmas: "XMAS",
  valentine: "VALENTINE",
  sepandarmazgan: "SEPANDAR",
  "eid-fitr": "EIDFITR",
  "chaharshanbe-suri": "SURI",
  nowruz: "NOWRUZ",
  sizdah: "SIZDAH",
};

export type EventDiscountPlan = {
  themeId: string;
  occurrence: EventOccurrence;
  /** occurrenceKey */
  key: string;
  code: string;
  percent: number;
  expiresAt: Date;
};

/** ورودی ناشناخته (از دیتابیس) → وضعیت معتبر؛ هر فیلد خراب = پیش‌فرض همون فیلد */
export function sanitizeEventDiscountState(_raw: unknown): EventDiscountState {
  throw new Error("not implemented");
}

/** کلید پایدار یک وقوع: `${themeId}:${occ.start}` */
export function occurrenceKey(_themeId: string, _occ: EventOccurrence): string {
  throw new Error("not implemented");
}

/**
 * اسم کد یک وقوع: EVENT_CODE_PREFIX (یا شناسه‌ی تم با حروف بزرگ و بدون
 * کاراکتر غیر A-Z0-9) + سال شمسی روز start. همیشه با /^[A-Z0-9_-]{3,32}$/ می‌خونه.
 */
export function eventDiscountCode(_theme: EventTheme, _occ: EventOccurrence): string {
  throw new Error("not implemented");
}

/** پایان اعتبار: آخر روز end به وقت تهران (+03:30، ایران دیگه ساعت تابستانی نداره) */
export function occurrenceExpiry(_occ: EventOccurrence): Date {
  throw new Error("not implemented");
}

/** وقوع‌هایی که now (تهران) داخلشونه و هنوز در generated نیستن؛ enabled خاموش → [] */
export function pendingEventDiscounts(_state: EventDiscountState, _catalog: EventTheme[], _now: Date): EventDiscountPlan[] {
  throw new Error("not implemented");
}

/**
 * وقوع جاری و وقوع‌های آینده (حداکثر limit تا، مرتب بر اساس start) برای
 * نمایش در پنل ادمین؛ generatedCode = کدی که برای اون وقوع ساخته شده یا null.
 */
export function eventDiscountSchedule(
  _state: EventDiscountState,
  _catalog: EventTheme[],
  _now: Date,
  _limit?: number,
): (EventDiscountPlan & { live: boolean; generatedCode: string | null })[] {
  throw new Error("not implemented");
}
