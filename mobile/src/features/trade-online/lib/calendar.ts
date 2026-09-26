// منطقِ خالصِ تقویمِ اقتصادیِ موبایل (بدونِ React/Dexie — تست‌پذیر).
//
// اپ هر بار یک «هفته»ی کامل (شنبه تا جمعه، روزِ محلی) رو بدونِ فیلتر از
// سرور می‌گیره و کش می‌کنه؛ فیلترها سمتِ کلاینت با *همون* معنای سرور
// (lib/mobileTradeOnlineCalendar.ts) اعمال می‌شن — پس آفلاین هم فیلتر کار می‌کنه.
import { FA_WEEKDAY, J_MONTHS, isoLocal, pad, toJalali } from "@/lib/jalali";
import { ECON_CALENDAR_CURRENCIES, type EconomicEventDto, type EconomicImpact } from "@/lib/trade-online-contract";

export type CalendarFilters = {
  currencies: string[];
  /** «سایر ارزها» — هر ارزی بیرونِ فهرستِ ۹تایی */
  other: boolean;
  impacts: EconomicImpact[];
  q: string;
};

export const EMPTY_FILTERS: CalendarFilters = { currencies: [], other: false, impacts: [], q: "" };

/** چند هفته‌ی آخرِ گرفته‌شده برای نمایشِ آفلاین نگه داشته می‌شه */
export const MAX_CACHED_WEEKS = 8;

/** پنجره‌ی «در حالِ انتشار» — همون اعدادِ وب (۲ دقیقه قبل، ۳ دقیقه بعد) */
export const PENDING_BEFORE_MS = 2 * 60_000;
export const PENDING_AFTER_MS = 3 * 60_000;

const KNOWN = new Set(ECON_CALENDAR_CURRENCIES.map((c) => c.code));

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** شنبه‌ی همون هفته (هفته‌ی ایرانی) */
export function weekStartOf(d: Date): Date {
  const day = startOfLocalDay(d);
  const back = (day.getDay() + 1) % 7; // شنبه=6 → 0
  return addDays(day, -back);
}

export function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** بازه‌ی درخواستِ یک هفته — tz همون چیزیه که وب می‌فرسته (دقیقه، شرقِ UTC مثبت) */
export function weekQuery(weekStart: Date, now: Date = new Date()): { from: string; to: string; tz: number } {
  return { from: isoLocal(weekStart), to: isoLocal(addDays(weekStart, 6)), tz: -now.getTimezoneOffset() };
}

/** همون معنای فیلترهای سرور (buildEconomicCalendarWhere) */
export function applyCalendarFilters(events: EconomicEventDto[], f: CalendarFilters): EconomicEventDto[] {
  const q = f.q.trim().toLowerCase().slice(0, 120);
  const cur = new Set(f.currencies.map((c) => c.toUpperCase()));
  const imp = new Set(f.impacts);
  return events.filter((e) => {
    if (q && !e.title.toLowerCase().includes(q)) return false;
    if (cur.size || f.other) {
      const c = e.currency.toUpperCase();
      const ok = (cur.size && cur.has(c)) || (f.other && !KNOWN.has(c));
      if (!ok) return false;
    }
    if (imp.size && !imp.has(e.impact)) return false;
    return true;
  });
}

export function activeFilterCount(f: CalendarFilters): number {
  return f.currencies.length + f.impacts.length + (f.other ? 1 : 0) + (f.q.trim() ? 1 : 0);
}

export type CalendarDay = { dayIso: string; events: EconomicEventDto[] };

/** گروه‌بندی بر اساسِ روزِ *محلی*، مرتب بر اساسِ زمان */
export function groupByLocalDay(events: EconomicEventDto[]): CalendarDay[] {
  const map = new Map<string, EconomicEventDto[]>();
  const sorted = [...events].sort((a, b) => Date.parse(a.occursAt) - Date.parse(b.occursAt) || a.id.localeCompare(b.id));
  for (const e of sorted) {
    const key = isoLocal(new Date(e.occursAt));
    const list = map.get(key);
    if (list) list.push(e);
    else map.set(key, [e]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dayIso, evs]) => ({ dayIso, events: evs }));
}

/** «شنبه ۵ مهر» */
export function jalaliDayLabel(d: Date): string {
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${FA_WEEKDAY[d.getDay()]} ${j[2]} ${J_MONTHS[j[1] - 1]}`;
}

/** «۵ تا ۱۱ مهر ۱۴۰۵» یا «۲۹ شهریور تا ۴ مهر ۱۴۰۵» */
export function jalaliWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const a = toJalali(weekStart.getFullYear(), weekStart.getMonth() + 1, weekStart.getDate());
  const b = toJalali(end.getFullYear(), end.getMonth() + 1, end.getDate());
  if (a[1] === b[1]) return `${a[2]} تا ${b[2]} ${J_MONTHS[b[1] - 1]} ${b[0]}`;
  return `${a[2]} ${J_MONTHS[a[1] - 1]} تا ${b[2]} ${J_MONTHS[b[1] - 1]} ${b[0]}`;
}

export function localTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** «۱۴۰۵/۰۷/۰۵ ۱۴:۳۰» — برای «آخرین به‌روزرسانی»/انقضای کد */
export function jalaliDateTime(iso: string): string {
  const d = new Date(iso);
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${j[0]}/${pad(j[1])}/${pad(j[2])} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type ActualCompare = "up" | "down" | "flat" | null;

function leadingNumber(v: string): number | null {
  const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** آینه‌ی compareActualToForecast وب — رنگِ actual */
export function compareActualToForecast(actual: string | null, forecast: string | null): ActualCompare {
  if (!actual || !forecast) return null;
  const a = leadingNumber(actual);
  const f = leadingNumber(forecast);
  if (a === null || f === null) return null;
  if (a > f) return "up";
  if (a < f) return "down";
  return "flat";
}

/** آیا رویدادی بی‌actual همین حوالی منتشر می‌شه (تازه‌سازیِ خودکار لازمه)؟ */
export function hasPendingRelease(events: EconomicEventDto[], now: number): boolean {
  return events.some((e) => {
    if (e.actual) return false;
    const t = Date.parse(e.occursAt);
    return t - PENDING_BEFORE_MS <= now && now <= t + PENDING_AFTER_MS;
  });
}

/** کدام هفته‌های کش‌شده باید پاک بشن (قدیمی‌ترین fetchedAt ها، بیش از MAX_CACHED_WEEKS) */
export function weeksToEvict(weeks: { weekStart: string; fetchedAt: string }[], keep = MAX_CACHED_WEEKS): string[] {
  if (weeks.length <= keep) return [];
  return [...weeks]
    .sort((a, b) => Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt))
    .slice(keep)
    .map((w) => w.weekStart);
}
