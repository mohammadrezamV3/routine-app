// جلسه‌هایی که روی **صفحه‌ی ساعت** نشان داده می‌شوند.
//
// عمداً از `FOREX_SESSIONS` مشتق می‌شود نه یک لیستِ دوم: اگر ساعتِ باز/بستِ
// سیدنی جایی عوض شود، هر دو با هم عوض می‌شوند و از هم درنمی‌روند.
//
// فرانکفورت فقط نمایشی است و به `TradeSession`ِ پریزما اضافه **نشده**:
// آن enum برچسبِ جلسه‌ی هر معامله در ژورنال است و اضافه‌کردنش هم migration
// می‌خواهد هم معامله‌های قبلی را دوباره برچسب نمی‌زند. چون بازه‌ی فرانکفورت
// تقریباً تمامش داخلِ لندن است، برچسبِ «لندن» برای ژورنال درست می‌ماند.

import { FOREX_SESSIONS } from "./forexSessions";

export type ClockSessionKey = "SYDNEY" | "TOKYO" | "FRANKFURT" | "LONDON" | "NEWYORK";

export type ClockSession = {
  key: ClockSessionKey;
  label: string;
  /** نامِ لاتین روی خودِ کمان — تریدرها با همین می‌شناسندشان */
  latin: string;
  tz: string;
  openMin: number;
  closeMin: number;
  flag: string;
  /** فقط نمایشی؟ (در ژورنال برچسب نمی‌خورد) */
  displayOnly?: boolean;
};

const FRANKFURT: ClockSession = {
  key: "FRANKFURT",
  label: "فرانکفورت",
  latin: "FRANKFURT",
  tz: "Europe/Berlin",
  openMin: 8 * 60,
  closeMin: 17 * 60,
  flag: "🇩🇪",
  displayOnly: true,
};

const LATIN: Record<string, string> = {
  SYDNEY: "SYDNEY",
  TOKYO: "TOKYO",
  LONDON: "LONDON",
  NEWYORK: "NEW YORK",
};

/** ترتیب از داخل به بیرون — همان چیدمانی که روی حلقه‌ها رسم می‌شود */
export const CLOCK_SESSIONS: ClockSession[] = [
  ...FOREX_SESSIONS.filter((s) => s.key === "SYDNEY" || s.key === "TOKYO").map((s) => ({
    key: s.key as ClockSessionKey, label: s.label, latin: LATIN[s.key],
    tz: s.tz, openMin: s.openMin, closeMin: s.closeMin, flag: s.flag,
  })),
  FRANKFURT,
  ...FOREX_SESSIONS.filter((s) => s.key === "LONDON" || s.key === "NEWYORK").map((s) => ({
    key: s.key as ClockSessionKey, label: s.label, latin: LATIN[s.key],
    tz: s.tz, openMin: s.openMin, closeMin: s.closeMin, flag: s.flag,
  })),
];
