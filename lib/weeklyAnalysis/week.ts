import { toJalali, J_MONTHS, FA_WEEKDAY } from "@/lib/jalali";

// تنها منبعِ «هفته» توی آنالیز هفتگی — شنبه تا جمعه، به وقت محلی کاربر.
//
// عمدا هیچ‌جا از getter های محلیِ Date (getDate/getDay/...) استفاده نمی‌شه:
// سرور معمولا UTC اجراست ولی تضمینی نیست، و getter محلی یعنی نتیجه به TZِ
// پروسه گره می‌خوره. همه‌چیز این‌جا «تاریخ تقویمی» به شکلِ نیمه‌شبِ UTC‌ه —
// دقیقا همون چیزی که Prisma برای ستون‌های @db.Date برمی‌گردونه/می‌گیره
// (نگاه کن به parseIsoDate توی lib/validate.ts).

const DAY_MS = 86_400_000;
const FALLBACK_TZ = "Asia/Tehran";

const fmtCache = new Map<string, Intl.DateTimeFormat>();

/** timezone نامعتبر (مثلا مقدار دستکاری‌شده توی دیتابیس) نباید کل آنالیز رو ۵۰۰ کنه. */
export function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return FALLBACK_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return FALLBACK_TZ;
  }
}

function formatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

function localParts(tz: string, d: Date) {
  const parts = formatter(tz).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") % 24, min: get("minute") };
}

/** تاریخِ تقویمیِ یک لحظه (timestamp) به وقت محلی کاربر، به شکل YYYY-MM-DD. */
export function localIso(tz: string, d: Date): string {
  const p = localParts(tz, d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** دقیقه از نیمه‌شبِ محلی (0..1439) — برای نظمِ ساعتِ خواب/بیداری. */
export function localMinuteOfDay(tz: string, d: Date): number {
  const p = localParts(tz, d);
  return p.h * 60 + p.min;
}

/** Date نیمه‌شبِ UTC (مثل خروجیِ @db.Date) → YYYY-MM-DD */
export function utcIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isoToUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function addDaysIso(iso: string, n: number): string {
  return utcIso(new Date(isoToUtcDate(iso).getTime() + n * DAY_MS));
}

/** JS getDay() همون تاریخِ تقویمی (0=یکشنبه … 6=شنبه) */
export function isoWeekday(iso: string): number {
  return isoToUtcDate(iso).getUTCDay();
}

export function weekdayFa(iso: string): string {
  return FA_WEEKDAY[isoWeekday(iso)];
}

export function todayIso(timezone: string, refDate: Date = new Date()): string {
  return localIso(safeTimezone(timezone), refDate);
}

export type WeekRange = { weekStart: Date; weekEnd: Date; weekStartIso: string; weekEndIso: string };

/**
 * بازه‌ی هفته (شنبه..جمعه) به وقت محلیِ کاربر. offset=0 هفته‌ی جاری، -1 قبلی.
 * weekStart/weekEnd نیمه‌شبِ UTCِ همون تاریخ‌های تقویمی‌ان — مستقیم برای
 * where روی ستون‌های @db.Date قابل استفاده‌ن (weekEnd شامل‌شونده‌ست).
 */
export function getWeekRange(timezone: string, offset: number, refDate: Date = new Date()): WeekRange {
  const today = isoToUtcDate(todayIso(timezone, refDate));
  const diffToSat = (today.getUTCDay() + 1) % 7; // شنبه=6 → 0
  const off = Number.isFinite(offset) ? Math.trunc(offset) : 0;
  const weekStart = new Date(today.getTime() - diffToSat * DAY_MS + off * 7 * DAY_MS);
  const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
  return { weekStart, weekEnd, weekStartIso: utcIso(weekStart), weekEndIso: utcIso(weekEnd) };
}

/** ۷ تاریخِ شنبه..جمعه (نیمه‌شبِ UTC). */
export function daysOfWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS));
}

/** همون daysOfWeek ولی به شکل رشته‌ی ISO — بیشترِ منطقِ دامنه‌ها با این کار می‌کنه. */
export function daysOfWeekIso(weekStartIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(weekStartIso, i));
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function faDigits(n: number): string {
  return String(n).replace(/\d/g, (c) => FA_DIGITS[Number(c)]);
}

/** برچسبِ جلالیِ هفته: «۱ تا ۷ مهر» یا اگه دو ماه رو بگیره «۲۹ شهریور تا ۴ مهر». */
export function weekLabelFa(weekStartIso: string): string {
  const s = isoToUtcDate(weekStartIso);
  const e = new Date(s.getTime() + 6 * DAY_MS);
  const [, sm, sd] = toJalali(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate());
  const [, em, ed] = toJalali(e.getUTCFullYear(), e.getUTCMonth() + 1, e.getUTCDate());
  if (sm === em) return `${faDigits(sd)} تا ${faDigits(ed)} ${J_MONTHS[em - 1]}`;
  return `${faDigits(sd)} ${J_MONTHS[sm - 1]} تا ${faDigits(ed)} ${J_MONTHS[em - 1]}`;
}

export function isCurrentWeek(timezone: string, weekStartIso: string, refDate: Date = new Date()): boolean {
  return getWeekRange(timezone, 0, refDate).weekStartIso === weekStartIso;
}

/** هفته‌ی جاری: چند روزش (با امروز) گذشته، 1..7؛ هفته‌ی گذشته 7؛ آینده 0. */
export function daysElapsed(timezone: string, weekStartIso: string, refDate: Date = new Date()): number {
  const t = todayIso(timezone, refDate);
  const endIso = addDaysIso(weekStartIso, 6);
  if (t > endIso) return 7;
  if (t < weekStartIso) return 0;
  return Math.round((isoToUtcDate(t).getTime() - isoToUtcDate(weekStartIso).getTime()) / DAY_MS) + 1;
}
