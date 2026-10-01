// منطق خالص داشبورد (بدون React/fetch) — جدا شده تا هم تست‌پذیر باشه
// هم کامپوننت‌ها فقط نمایش بدن. هیچ import سمت‌کلاینت/سروری این‌جا نیست.

import { isoLocal, jalaliToIso, toJalali } from "./jalali";
import { tasksForDate, ScheduleOpts } from "./schedule";

// ── سلام و «فاز» روز ─────────────────────────────────────────
export type DayPhase = "dawn" | "day" | "dusk" | "night";

/** فاز روز بر اساس ساعت محلی — آیکون و متن سلام هیرو از همین میاد */
export function dayPhase(d: Date): DayPhase {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "dawn";
  if (h >= 11 && h < 17) return "day";
  if (h >= 17 && h < 21) return "dusk";
  return "night";
}

export const PHASE_GREETING: Record<DayPhase, string> = {
  dawn: "صبح بخیر",
  day: "روز بخیر",
  dusk: "عصر بخیر",
  night: "شب بخیر",
};

// ── قوس روز (بیداری → خواب) ──────────────────────────────────
function hhmmToMin(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

/**
 * چقدر از «روز بیداری» گذشته (۰..۱) — بین ساعت بیداری و خواب خود کاربر،
 * نه ۰۰:۰۰ تا ۲۴:۰۰. خواب بعد از نیمه‌شب (مثلا 01:30) درست پیچیده می‌شه.
 * قبل از بیداری → 0، بعد از خواب → 1. ورودی نامعتبر → null.
 */
export function awakeProgress(now: Date, wake: string, sleep: string): number | null {
  const w = hhmmToMin(wake), sl = hhmmToMin(sleep);
  if (w === null || sl === null) return null;
  const span = ((sl - w + 1440) % 1440) || 1440;
  const cur = now.getHours() * 60 + now.getMinutes();
  const sinceWake = (cur - w + 1440) % 1440;
  if (sinceWake < span) return sinceWake / span;
  // فاصله‌ی خواب تا بیداری: نیمه‌ی اولش (تازه از وقت خواب گذشته) یعنی «روز
  // تمام شده» → 1؛ نیمه‌ی دوم (نزدیک بیداری) یعنی «روز تازه هنوز شروع نشده» → 0.
  const gap = 1440 - span;
  const sinceSleep = sinceWake - span;
  return sinceSleep < gap / 2 ? 1 : 0;
}

/** دقیقه‌های باقی‌مانده تا خواب (برای «X ساعت تا پایان روزت») */
export function minutesUntilSleep(now: Date, wake: string, sleep: string): number | null {
  const p = awakeProgress(now, wake, sleep);
  const w = hhmmToMin(wake), sl = hhmmToMin(sleep);
  if (p === null || w === null || sl === null) return null;
  const span = (sl <= w ? sl + 1440 : sl) - w;
  return Math.max(0, Math.round(span * (1 - p)));
}

// ── نقشه‌ی حرارتی ثبات (چند هفته‌ی اخیر) ─────────────────────
export type HeatCell = { iso: string; pct: number | null; future: boolean; today: boolean };

/**
 * ستون‌های هفته‌ای (شنبه..جمعه) برای `weeks` هفته‌ی اخیر، آخرین ستون همین
 * هفته. pct=null یعنی اون روز برنامه‌ای نداشته (خاکستری، نه قرمز) — روز
 * بدون برنامه نباید به‌چشم «شکست» بیاد.
 */
export function buildHeatmap(
  today: Date,
  weeks: number,
  opts: ScheduleOpts,
  daily: Record<string, { tasks: Record<string, boolean> } | undefined>
): HeatCell[][] {
  const todayIso = isoLocal(today);
  const diffToSat = (today.getDay() + 1) % 7;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToSat - (weeks - 1) * 7);
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i);
      const iso = isoLocal(d);
      const future = iso > todayIso;
      let pct: number | null = null;
      if (!future) {
        const expected = tasksForDate(d, opts);
        if (expected.length) {
          const rec = daily[iso];
          const done = rec ? expected.filter((t) => rec.tasks[t.id]).length : 0;
          pct = Math.round((done / expected.length) * 100);
        }
      }
      col.push({ iso, pct, future, today: iso === todayIso });
    }
    cols.push(col);
  }
  return cols;
}

/** سطح رنگ (۰..۴) برای یک خانه */
export function heatLevel(pct: number | null): number {
  if (pct === null) return -1;
  if (pct === 0) return 0;
  if (pct < 40) return 1;
  if (pct < 75) return 2;
  if (pct < 100) return 3;
  return 4;
}

/** استریک روزهای کامل تا دیروز (+ امروز اگه کامل شده) — روز بی‌برنامه رد می‌شه */
export function streakFromHeatmap(cols: HeatCell[][]): number {
  const flat = cols.flat().filter((c) => !c.future);
  let s = 0;
  for (let i = flat.length - 1; i >= 0; i--) {
    const c = flat[i];
    if (c.today) { if (c.pct === 100) s++; continue; }
    if (c.pct === null) continue;
    if (c.pct === 100) s++;
    else break;
  }
  return s;
}

// ── اسپارک‌لاین (بدون کتابخانه‌ی نمودار) ───────────────────────
/**
 * مسیر نرم SVG (منحنی مونوتون-تقریبی با کنترل‌پوینت‌های افقی) برای یک سری
 * عدد، در کادر w×h با پدینگ عمودی pad. خروجی: خط + ناحیه‌ی زیر خط + جای
 * آخرین نقطه (برای نقطه‌ی درخشان). سری کمتر از ۲ نقطه → null.
 */
export function sparkPath(values: number[], w: number, h: number, pad = 4): { line: string; area: string; last: { x: number; y: number }; zeroY: number | null } | null {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const y = (v: number) => pad + (h - pad * 2) * (1 - (v - min) / range);
  const pts = values.map((v, i) => ({ x: i * step, y: y(v) }));
  const r = (n: number) => Math.round(n * 100) / 100;
  let line = `M${r(pts[0].x)} ${r(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cx = (p0.x + p1.x) / 2;
    line += ` C${r(cx)} ${r(p0.y)} ${r(cx)} ${r(p1.y)} ${r(p1.x)} ${r(p1.y)}`;
  }
  const area = `${line} L${r(w)} ${h} L0 ${h} Z`;
  const zeroY = min < 0 && max > 0 ? r(y(0)) : null;
  return { line, area, last: pts[pts.length - 1], zeroY };
}

/** جمع تجمعی — برای منحنی اکوئیتی از سود/زیان روزانه */
export function cumulative(values: number[]): number[] {
  let acc = 0;
  return values.map((v) => (acc += v));
}

// ── زمان ─────────────────────────────────────────────────────
/** «۲ ساعت و ۱۵ دقیقه» / «۱۲ دقیقه» / «کمتر از یک دقیقه» — اعداد لاتین، faNum بعدا */
export function durationParts(ms: number): { d: number; h: number; m: number } {
  const total = Math.max(0, Math.floor(ms / 60000));
  return { d: Math.floor(total / 1440), h: Math.floor((total % 1440) / 60), m: total % 60 };
}

/** عدد فشرده: 1250 → «1.3K»، 1_250_000 → «1.3M» (برای سود/زیان بزرگ روی کارت) */
export function compactNumber(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}${trim(a / 1_000_000)}M`;
  if (a >= 10_000) return `${sign}${trim(a / 1000)}K`;
  return `${sign}${Math.round(a * 100) / 100}`;
}
function trim(v: number) {
  return (Math.round(v * 10) / 10).toString();
}

// ── نقشه‌ی ثبات: سالانه/ماهانه (تقویم شمسی) ──────────────────────────

type DailyMap = Record<string, { tasks: Record<string, boolean> } | undefined>;

/** سال/ماه/روز شمسی یک ISO محلی */
export function jalaliOfIso(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return toJalali(y, m, d);
}

/** طول واقعی ماه شمسی — اسفند سال کبیسه ۳۰ روزه‌ست (از روی تبدیل دقیق) */
export function jalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalaliToIso(jy, 12, 30) ? 30 : 29;
}

/** درصد انجام یک روز؛ null یعنی اون روز برنامه‌ای نداشته */
export function dayPct(iso: string, opts: ScheduleOpts, daily: DailyMap): number | null {
  const [y, m, d] = iso.split("-").map(Number);
  const expected = tasksForDate(new Date(y, m - 1, d), opts);
  if (!expected.length) return null;
  const rec = daily[iso];
  const done = rec ? expected.filter((t) => rec.tasks[t.id]).length : 0;
  return Math.round((done / expected.length) * 100);
}

export type MonthCell = { iso: string; jd: number; pct: number | null; future: boolean; today: boolean };
export type MonthMap = {
  jy: number;
  jm: number;
  /** خانه‌های خالی قبل از روز اول (هفته از شنبه) */
  lead: number;
  cells: MonthCell[];
  /** میانگین روزهای برنامه‌دار گذشته؛ null یعنی هیچ روز برنامه‌داری نبوده */
  avg: number | null;
  perfect: number;
  tracked: number;
};

/** `startIso`: روزهای قبل از این (مثلا قبل از عضویت) «بدون برنامه» حساب می‌شن، نه ۰٪ قرمز */
export function buildMonth(jy: number, jm: number, todayIso: string, opts: ScheduleOpts, daily: DailyMap, startIso?: string): MonthMap {
  const len = jalaliMonthDays(jy, jm);
  const cells: MonthCell[] = [];
  let lead = 0;
  let sum = 0, tracked = 0, perfect = 0;
  for (let jd = 1; jd <= len; jd++) {
    const iso = jalaliToIso(jy, jm, jd);
    if (!iso) continue;
    if (jd === 1) {
      const [y, m, d] = iso.split("-").map(Number);
      lead = (new Date(y, m - 1, d).getDay() + 1) % 7; // شنبه = ۰
    }
    const future = iso > todayIso;
    const pct = future || (startIso && iso < startIso) ? null : dayPct(iso, opts, daily);
    if (pct !== null) { sum += pct; tracked++; if (pct === 100) perfect++; }
    cells.push({ iso, jd, pct, future, today: iso === todayIso });
  }
  return { jy, jm, lead, cells, avg: tracked ? Math.round(sum / tracked) : null, perfect, tracked };
}

export type YearMonth = { jm: number; avg: number | null; perfect: number; future: boolean; current: boolean };

/** خلاصه‌ی ۱۲ ماه یک سال شمسی — برای انتخابگر ماه (هر ماه یک خانه‌ی رنگی) */
export function buildYear(jy: number, todayIso: string, opts: ScheduleOpts, daily: DailyMap): YearMonth[] {
  const [ty, tm] = jalaliOfIso(todayIso);
  return Array.from({ length: 12 }, (_, i) => {
    const jm = i + 1;
    const first = jalaliToIso(jy, jm, 1);
    const future = !first || first > todayIso;
    if (future) return { jm, avg: null, perfect: 0, future: true, current: false };
    const m = buildMonth(jy, jm, todayIso, opts, daily);
    return { jm, avg: m.avg, perfect: m.perfect, future: false, current: ty === jy && tm === jm };
  });
}

/** طولانی‌ترین زنجیره‌ی روزهای کامل در یک فهرست مرتب روزها (روز بی‌برنامه زنجیره رو نمی‌شکنه) */
export function bestRun(days: { pct: number | null; future?: boolean; today?: boolean }[]): number {
  let best = 0, run = 0;
  for (const c of days) {
    if (c.future || c.pct === null) continue;
    if (c.pct === 100) { run++; if (run > best) best = run; }
    else if (!c.today) run = 0;
  }
  return best;
}

/** ISO اولین و آخرین روز یک سال شمسی (آخرین روز حداکثر تا امروز) */
export function jalaliYearRange(jy: number, todayIso: string): { from: string; to: string } | null {
  const from = jalaliToIso(jy, 1, 1);
  const last = jalaliToIso(jy, 12, jalaliMonthDays(jy, 12));
  if (!from || !last || from > todayIso) return null;
  return { from, to: last < todayIso ? last : todayIso };
}
