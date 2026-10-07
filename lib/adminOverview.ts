// توابع خالص تجمیع داشبورد ادمین (/admin) — بدون دیتابیس و بدون وابستگی
// سروری، تا هم سمت سرور هم کلاینت و تست قابل استفاده باشن.

const TEHRAN_OFFSET_MS = 3.5 * 3600_000; // ایران DST نداره

/** کلید روز تهران به شکل YYYY-MM-DD */
export function tehranDayKey(d: Date | string | number): string {
  return new Date(new Date(d).getTime() + TEHRAN_OFFSET_MS).toISOString().slice(0, 10);
}

/** کلیدهای روز (قدیمی به جدید) برای n روز منتهی به `end` (شامل روز end) */
export function lastDayKeys(end: Date, n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(tehranDayKey(end.getTime() - i * 86400000));
  return keys;
}

/** شمارش رویدادها در سطل‌های روزانه؛ رویداد بیرون از کلیدها نادیده گرفته می‌شه */
export function bucketCounts(dates: (Date | string | null | undefined)[], keys: string[]): number[] {
  const idx = new Map(keys.map((k, i) => [k, i]));
  const out = new Array(keys.length).fill(0);
  for (const d of dates) {
    if (!d) continue;
    const i = idx.get(tehranDayKey(d));
    if (i !== undefined) out[i]++;
  }
  return out;
}

/** جمع مقدار در سطل‌های روزانه */
export function bucketSums(rows: { at: Date | string | null | undefined; value: number }[], keys: string[]): number[] {
  const idx = new Map(keys.map((k, i) => [k, i]));
  const out = new Array(keys.length).fill(0);
  for (const r of rows) {
    if (!r.at) continue;
    const i = idx.get(tehranDayKey(r.at));
    if (i !== undefined) out[i] += r.value;
  }
  return out;
}

/** درصد تغییر نسبت به دوره‌ی قبل؛ پایه‌ی صفر: null (نه 100 ساختگی) */
export function deltaPercent(cur: number, prev: number): number | null {
  if (!isFinite(cur) || !isFinite(prev)) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

/** ریال -> تومان */
export function rialToToman(rial: number): number {
  return Math.round(rial / 10);
}

export function safeRate(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

/** نقاط polyline اسپارک‌لاین در کادر w x h (با حاشیه‌ی pad)؛ سری ثابت = خط وسط */
export function sparklinePoints(values: number[], w = 72, h = 26, pad = 2): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const y = span === 0 ? h / 2 : h - pad - ((v - min) / span) * (h - pad * 2);
      return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** مسیر خط و ناحیه‌ی نمودار درآمد؛ x از 0..w */
export function areaPaths(values: number[], w: number, h: number, padTop = 20, padBottom = 25): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };
  const max = Math.max(...values, 1);
  const inner = h - padTop - padBottom;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values.map((v, i) => [i * step, padTop + inner - (v / max) * inner] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = `${line} L${last[0].toFixed(1)} ${h - padBottom} L0 ${h - padBottom} Z`;
  return { line, area };
}

/** ارتفاع ستون‌ها (0..maxH) برای نمودار میله‌ای ثبت‌نام */
export function barHeights(values: number[], maxH: number): number[] {
  const max = Math.max(...values, 0);
  if (max === 0) return values.map(() => 0);
  return values.map((v) => (v === 0 ? 0 : Math.max(3, Math.round((v / max) * maxH))));
}

/** زمان نسبی فارسی؛ ارقام لاتین */
export function relativeTimeFa(at: Date | string | number, now: Date | number = Date.now()): string {
  const diff = Math.max(0, new Date(now).getTime() - new Date(at).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return "لحظاتی پیش";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعت پیش`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} روز پیش`;
  return `${Math.floor(d / 30)} ماه پیش`;
}

export type FeedKind = "signup" | "purchase" | "ticket" | "mentor" | "failed_payment";
export type FeedItem = { id: string; kind: FeedKind; text: string; at: string; href: string };

/** ادغام چند فهرست فعالیت، مرتب از جدید به قدیم، با حذف تکراری و سقف */
export function mergeFeed(lists: FeedItem[][], limit = 10): FeedItem[] {
  const seen = new Set<string>();
  const all: FeedItem[] = [];
  for (const l of lists) {
    for (const it of l) {
      const k = `${it.kind}:${it.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      all.push(it);
    }
  }
  all.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return all.slice(0, limit);
}

export type QueueItem = { key: string; title: string; sub: string; count: number; href: string; tone: "red" | "amber" };

/** مجموع موارد منتظر اقدام */
export function queueTotal(items: { count: number }[]): number {
  return items.reduce((a, b) => a + Math.max(0, b.count), 0);
}

/** وضعیت کلی سلامت: همه سالم / نیاز به توجه / مشکل */
export function healthSummary(h: { dbConnected: boolean; errors24h: number | null }): "ok" | "warn" | "bad" {
  if (!h.dbConnected) return "bad";
  if ((h.errors24h ?? 0) > 0) return "warn";
  return "ok";
}

/** نگاشت کلید بازه‌ی داشبورد به کلید بازه‌ی تحلیل‌ها */
export const DASH_RANGES = ["today", "7d", "30d", "90d"] as const;
export type DashRange = (typeof DASH_RANGES)[number];
export function parseDashRange(v: string | null | undefined): DashRange {
  return (DASH_RANGES as readonly string[]).includes(v || "") ? (v as DashRange) : "30d";
}
export function dashRangeDays(r: DashRange): number {
  return r === "today" ? 1 : r === "7d" ? 7 : r === "30d" ? 30 : 90;
}
