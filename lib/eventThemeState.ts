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
  if (
    typeof _raw !== "object" ||
    _raw === null ||
    Array.isArray(_raw) ||
    !("active" in _raw)
  ) {
    return EMPTY_EVENT_THEME_STATE;
  }

  const raw = _raw as Record<string, unknown>;

  if (raw.active === null || raw.active === undefined) {
    return { active: null };
  }

  if (
    typeof raw.active !== "object" ||
    Array.isArray(raw.active)
  ) {
    return EMPTY_EVENT_THEME_STATE;
  }

  const active = raw.active as Record<string, unknown>;

  // چک id در کاتالوگ
  if (typeof active.id !== "string" || !_catalog.some((t) => t.id === active.id)) {
    return EMPTY_EVENT_THEME_STATE;
  }

  // چک releasedAt ISO
  if (typeof active.releasedAt !== "string") {
    return EMPTY_EVENT_THEME_STATE;
  }
  try {
    new Date(active.releasedAt).toISOString();
  } catch {
    return EMPTY_EVENT_THEME_STATE;
  }

  // چک endsAt
  if (active.endsAt !== null && typeof active.endsAt !== "string") {
    return EMPTY_EVENT_THEME_STATE;
  }
  if (typeof active.endsAt === "string") {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(active.endsAt)) {
      return EMPTY_EVENT_THEME_STATE;
    }
  }

  return {
    active: {
      id: active.id as string,
      releasedAt: active.releasedAt as string,
      endsAt: active.endsAt as string | null,
    },
  };
}

/** تاریخ امروز به وقت تهران (YYYY-MM-DD) برای لحظه‌ی now */
export function tehranDateIso(_now: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(_now);
}

/** شناسه‌ی تمی که الان باید برای همه اعمال بشه (منقضی‌نشده و موجود در کاتالوگ)، یا null */
export function resolveActiveEventTheme(_state: EventThemeState, _now: Date, _catalog: EventTheme[]): string | null {
  if (!_state.active) {
    return null;
  }

  const { id, endsAt } = _state.active;

  // چک موجودی در کاتالوگ
  if (!_catalog.some((t) => t.id === id)) {
    return null;
  }

  // چک انقضا
  if (endsAt !== null && tehranDateIso(_now) > endsAt) {
    return null;
  }

  return id;
}

/** وقوعی از این تم که امروز (تهران) داخلشه، یا null */
export function currentOccurrence(_theme: EventTheme, _now: Date): EventOccurrence | null {
  const today = tehranDateIso(_now);
  return (
    _theme.occurrences.find((occ) => occ.start <= today && today <= occ.end) ?? null
  );
}

/** اولین وقوع از امروز به بعد (شامل وقوع جاری)، یا null */
export function nextOccurrence(_theme: EventTheme, _now: Date): EventOccurrence | null {
  const today = tehranDateIso(_now);
  const current = currentOccurrence(_theme, _now);
  if (current) {
    return current;
  }
  return (
    _theme.occurrences.find((occ) => occ.start > today) ?? null
  );
}

export type TimelineItem = { theme: EventTheme; occurrence: EventOccurrence; status: "live-window" | "upcoming" | "past" };

/** تابع کمکی: جمع ماه به تاریخ */
function addMonths(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  let y = year;
  let m = month + months;

  while (m > 12) {
    m -= 12;
    y += 1;
  }

  // محدود کردن روز به آخرین روز ماه
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) {
    daysInMonth[1] = 29;
  }
  const clampedDay = Math.min(day, daysInMonth[m - 1]);

  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${clampedDay.toString().padStart(2, "0")}`;
}

/** همه‌ی وقوع‌ها از from تا months ماه بعد، مرتب بر اساس شروع؛ status نسبت به from */
export function eventTimeline(_catalog: EventTheme[], _from: Date, _months = 24): TimelineItem[] {
  const today = tehranDateIso(_from);
  const endDate = addMonths(today, _months);

  const items: TimelineItem[] = [];

  for (const theme of _catalog) {
    for (const occurrence of theme.occurrences) {
      // فقط وقوع‌هایی که end >= today و start <= endDate
      if (occurrence.end < today || occurrence.start > endDate) {
        continue;
      }

      // تعیین status
      let status: "live-window" | "upcoming" | "past";
      if (occurrence.start <= today && today <= occurrence.end) {
        status = "live-window";
      } else if (occurrence.start > today) {
        status = "upcoming";
      } else {
        status = "past";
      }

      items.push({ theme, occurrence, status });
    }
  }

  // مرتب‌سازی: ابتدا بر اساس start، سپس بر اساس theme id
  items.sort((a, b) => {
    if (a.occurrence.start !== b.occurrence.start) {
      return a.occurrence.start.localeCompare(b.occurrence.start);
    }
    return a.theme.id.localeCompare(b.theme.id);
  });

  return items;
}

/** وضعیت انتشار: اگه الان داخل یک وقوعه، endsAt = پایان همون وقوع؛ وگرنه endsAt = null */
export function buildReleaseState(_theme: EventTheme, _now: Date): EventThemeState {
  const occ = currentOccurrence(_theme, _now);
  return {
    active: {
      id: _theme.id,
      releasedAt: _now.toISOString(),
      endsAt: occ?.end ?? null,
    },
  };
}
