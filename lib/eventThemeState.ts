// منطق خالص وضعیت تم مناسبتی (بدون prisma/DOM). [قرارداد — پیاده‌سازی و تست با ایجنت C]
// وضعیت سراسری در AppSetting با کلید EVENT_THEME_KEY ذخیره می‌شه؛ پیش‌نمایش
// ادمین فقط localStorage همون دستگاهه (EVENT_PREVIEW_KEY).

import type { EventOccurrence, EventTheme } from "./eventThemes";

export const EVENT_THEME_KEY = "event_theme";
export const EVENT_PREVIEW_KEY = "arion:eventThemePreview";

export type EventThemeState = {
  /** تم منتشرشده برای همه، یا null = حالت عادی */
  active: {
    id: string;
    /** ISO لحظه‌ی انتشار */
    releasedAt: string;
    /** آخرین روز نمایش (YYYY-MM-DD، شامل، وقت تهران) یا null = تا ریست دستی */
    endsAt: string | null;
  } | null;
};

export const EMPTY_EVENT_THEME_STATE: EventThemeState = { active: null };

/** ورودی ناشناخته (از دیتابیس) → وضعیت معتبر؛ شناسه‌ی ناموجود در کاتالوگ = null */
export function sanitizeEventThemeState(_raw: unknown, _catalog: EventTheme[]): EventThemeState {
  return EMPTY_EVENT_THEME_STATE;
}

/** تاریخ امروز به وقت تهران (YYYY-MM-DD) برای لحظه‌ی now */
export function tehranDateIso(_now: Date): string {
  return "";
}

/** شناسه‌ی تمی که الان باید برای همه اعمال بشه (منقضی‌نشده و موجود در کاتالوگ)، یا null */
export function resolveActiveEventTheme(_state: EventThemeState, _now: Date, _catalog: EventTheme[]): string | null {
  return null;
}

/** وقوعی از این تم که امروز (تهران) داخلشه، یا null */
export function currentOccurrence(_theme: EventTheme, _now: Date): EventOccurrence | null {
  return null;
}

/** اولین وقوع از امروز به بعد (شامل وقوع جاری)، یا null */
export function nextOccurrence(_theme: EventTheme, _now: Date): EventOccurrence | null {
  return null;
}

export type TimelineItem = { theme: EventTheme; occurrence: EventOccurrence; status: "live-window" | "upcoming" | "past" };

/** همه‌ی وقوع‌ها از from تا months ماه بعد، مرتب بر اساس شروع؛ status نسبت به from */
export function eventTimeline(_catalog: EventTheme[], _from: Date, _months = 24): TimelineItem[] {
  return [];
}

/** وضعیت انتشار: اگه الان داخل یک وقوعه، endsAt = پایان همون وقوع؛ وگرنه endsAt = null */
export function buildReleaseState(_theme: EventTheme, _now: Date): EventThemeState {
  return EMPTY_EVENT_THEME_STATE;
}
