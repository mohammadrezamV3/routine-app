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
import { currentOccurrence, tehranDateIso } from "./eventThemeState";
import { toJalali } from "./jalali";

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

/** پیشوند کد هر مناسبت؛ کد = پیشوند + سال شمسی روز پایان وقوع (مثلا NOWRUZ1406) */
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

const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

/** ورودی ناشناخته (از دیتابیس) → وضعیت معتبر؛ هر فیلد خراب = پیش‌فرض همون فیلد */
export function sanitizeEventDiscountState(raw: unknown): EventDiscountState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_EVENT_DISCOUNT_STATE, generated: {} };
  }
  const r = raw as Record<string, unknown>;
  const enabled = typeof r.enabled === "boolean" ? r.enabled : DEFAULT_EVENT_DISCOUNT_STATE.enabled;
  const percent =
    typeof r.percent === "number" && Number.isInteger(r.percent) && r.percent >= 1 && r.percent <= 100
      ? r.percent
      : EVENT_DISCOUNT_PERCENT;
  const generated: Record<string, string> = {};
  if (r.generated && typeof r.generated === "object" && !Array.isArray(r.generated)) {
    for (const [k, v] of Object.entries(r.generated as Record<string, unknown>)) {
      if (typeof v === "string" && CODE_RE.test(v)) generated[k] = v;
    }
  }
  return { enabled, percent, generated };
}

/** کلید پایدار یک وقوع: `${themeId}:${occ.start}` */
export function occurrenceKey(themeId: string, occ: EventOccurrence): string {
  return `${themeId}:${occ.start}`;
}

/**
 * اسم کد یک وقوع: EVENT_CODE_PREFIX (یا شناسه‌ی تم با حروف بزرگ و بدون
 * کاراکتر غیر A-Z0-9) + سال شمسی روز end (نوروزی که از اسفند شروع می‌شه کد سال نو می‌گیره). همیشه با /^[A-Z0-9_-]{3,32}$/ می‌خونه.
 */
export function eventDiscountCode(theme: EventTheme, occ: EventOccurrence): string {
  const prefix = EVENT_CODE_PREFIX[theme.id] ?? (theme.id.toUpperCase().replace(/[^A-Z0-9]/g, "") || "EVENT");
  const [y, m, d] = occ.end.split("-").map(Number);
  const jy = toJalali(y, m, d)[0];
  return `${prefix}${jy}`;
}

/** پایان اعتبار: آخر روز end به وقت تهران (+03:30، ایران دیگه ساعت تابستانی نداره) */
export function occurrenceExpiry(occ: EventOccurrence): Date {
  return new Date(`${occ.end}T23:59:59.999+03:30`);
}

function planFor(theme: EventTheme, occ: EventOccurrence, percent: number): EventDiscountPlan {
  return {
    themeId: theme.id,
    occurrence: occ,
    key: occurrenceKey(theme.id, occ),
    code: eventDiscountCode(theme, occ),
    percent,
    expiresAt: occurrenceExpiry(occ),
  };
}

/** وقوع‌هایی که now (تهران) داخلشونه و هنوز در generated نیستن؛ enabled خاموش → [] */
export function pendingEventDiscounts(state: EventDiscountState, catalog: EventTheme[], now: Date): EventDiscountPlan[] {
  if (!state.enabled) return [];
  const out: EventDiscountPlan[] = [];
  for (const theme of catalog) {
    const occ = currentOccurrence(theme, now);
    if (!occ) continue;
    if (occurrenceKey(theme.id, occ) in state.generated) continue;
    out.push(planFor(theme, occ, state.percent));
  }
  return out;
}

/**
 * وقوع جاری و وقوع‌های آینده (حداکثر limit تا، مرتب بر اساس start) برای
 * نمایش در پنل ادمین؛ generatedCode = کدی که برای اون وقوع ساخته شده یا null.
 */
export function eventDiscountSchedule(
  state: EventDiscountState,
  catalog: EventTheme[],
  now: Date,
  limit = 6,
): (EventDiscountPlan & { live: boolean; generatedCode: string | null })[] {
  const today = tehranDateIso(now);
  const rows: (EventDiscountPlan & { live: boolean; generatedCode: string | null })[] = [];
  for (const theme of catalog) {
    const cur = currentOccurrence(theme, now);
    for (const occ of theme.occurrences) {
      const live = cur === occ;
      if (!live && !(occ.start > today)) continue;
      const plan = planFor(theme, occ, state.percent);
      rows.push({ ...plan, live, generatedCode: state.generated[plan.key] ?? null });
    }
  }
  rows.sort((a, b) => {
    if (a.occurrence.start !== b.occurrence.start) return a.occurrence.start < b.occurrence.start ? -1 : 1;
    return a.themeId < b.themeId ? -1 : a.themeId > b.themeId ? 1 : 0;
  });
  return rows.slice(0, Math.max(0, limit));
}
