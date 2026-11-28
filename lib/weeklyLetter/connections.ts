// «ارتباط‌ها» — موتور خالص و تست‌دار رابطه‌ی بین منبع‌های داده‌ی کاربر در پنجره‌ی
// هفته‌ی جاری + ۴ هفته‌ی قبل (۳۵ روز): خواب، روتین، کارها، تمرین، تغذیه، دارو، ترید.
// بدون import سروری. هر یافته فقط یک «مشاهده» از داده‌ی خود کاربره، نه ادعای علت یا
// پزشکی، و فقط وقتی میاد که هم تعداد نمونه و هم اندازه‌ی اثر از حد پایین بالاتر باشه.
// ورودی رو connectionsServer.ts از دیتابیس (فقط داده‌ی خود کاربر و ماژول‌های مجاز) می‌سازه.
import { tr } from "@/lib/i18n";
import { weekdayName } from "@/lib/jalali";
import type { AnalysisDomain } from "@/lib/weeklyAnalysis/types";

// ───────────────────────── آستانه‌ها ─────────────────────────
/** کمترین تعداد روز جفت‌شده برای گزارش یک رابطه */
export const CONN_MIN_PAIRS = 10;
/** کمترین تعداد روز در هر گروه (بالا/پایین) */
export const CONN_MIN_GROUP = 3;
/** کمترین |r| پیرسون */
export const CONN_MIN_R = 0.35;
/** کمترین تعداد معامله برای الگوی ساعت و تقسیم‌های معامله‌ای */
export const CONN_MIN_TRADES = 12;
export const CONN_MIN_TRADE_GROUP = 4;
/** حداکثر تعداد یافته در خروجی */
export const CONN_MAX_ITEMS = 9;

export type ConnDomain = AnalysisDomain | "meds";

export type MetricKey =
  | "sleepHours" | "sleepQuality" | "bedtime" | "latency" | "awakenings"
  | "routinePct" | "tasksPct" | "workout" | "kcalOff" | "protein" | "medPct"
  | "tradeCount" | "checklistPct" | "planPct" | "tradeR" | "dayWin"
  | "lastTick" | "workoutStart";

type Dir = "high" | "low" | "none";

type MetricDef = {
  domain: ConnDomain;
  label: () => string;
  fmt: (v: number) => string;
  /** جهت «بهتر» (برای رنگ لحن) */
  good: Dir;
  /** کمترین اختلاف میانگین دو گروه که ارزش گفتن داره */
  minDiff: number;
};

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const pctFmt = (v: number) => `${r0(v)}%`;

/** دقیقه‌ی روز → HH:mm (برای شب‌ها که از ساعت 18 شیفت دارن برمی‌گرده) */
export const BEDTIME_SHIFT = 18 * 60;
const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** دقیقه‌ی خواب‌رفتن با شیفت 18:00 تا 23:30 و 00:30 پیوسته باشن (برای میانگین/انحراف) */
export function bedtimeShifted(minuteOfDay: number): number {
  return (((minuteOfDay - BEDTIME_SHIFT) % 1440) + 1440) % 1440;
}

const METRICS: Record<MetricKey, MetricDef> = {
  sleepHours: { domain: "sleep", label: () => tr("ساعت خواب", "sleep duration"), fmt: (v) => tr(`${r1(v)} ساعت`, `${r1(v)} h`), good: "high", minDiff: 0.7 },
  sleepQuality: { domain: "sleep", label: () => tr("کیفیت خواب", "sleep quality"), fmt: (v) => `${r1(v)}/5`, good: "high", minDiff: 0.8 },
  bedtime: { domain: "sleep", label: () => tr("ساعت خواب‌رفتن", "bedtime"), fmt: (v) => hhmm(v + BEDTIME_SHIFT), good: "low", minDiff: 40 },
  latency: { domain: "sleep", label: () => tr("زمان به خواب رفتن", "time to fall asleep"), fmt: (v) => tr(`${r0(v)} دقیقه`, `${r0(v)} min`), good: "low", minDiff: 10 },
  awakenings: { domain: "sleep", label: () => tr("بیدارشدن‌های شب", "night awakenings"), fmt: (v) => `${r1(v)}`, good: "low", minDiff: 1 },
  routinePct: { domain: "routine", label: () => tr("انجام روتین", "routine completion"), fmt: pctFmt, good: "high", minDiff: 12 },
  tasksPct: { domain: "tasks", label: () => tr("انجام کارها", "task completion"), fmt: pctFmt, good: "high", minDiff: 12 },
  workout: { domain: "fitness", label: () => tr("تمرین", "workout"), fmt: (v) => pctFmt(v * 100), good: "high", minDiff: 0.25 },
  kcalOff: { domain: "nutrition", label: () => tr("فاصله از کالری هدف", "distance from the calorie target"), fmt: pctFmt, good: "low", minDiff: 10 },
  protein: { domain: "nutrition", label: () => tr("پروتئین", "protein"), fmt: (v) => `${r0(v)} g`, good: "high", minDiff: 15 },
  medPct: { domain: "meds", label: () => tr("مصرف دارو", "medication"), fmt: pctFmt, good: "high", minDiff: 15 },
  tradeCount: { domain: "trading", label: () => tr("تعداد معامله‌ی روز", "trades per day"), fmt: (v) => `${r1(v)}`, good: "none", minDiff: 1.5 },
  checklistPct: { domain: "trading", label: () => tr("چک‌لیست معامله", "trade checklist"), fmt: pctFmt, good: "high", minDiff: 15 },
  planPct: { domain: "trading", label: () => tr("پایبندی به پلن", "plan adherence"), fmt: pctFmt, good: "high", minDiff: 15 },
  tradeR: { domain: "trading", label: () => tr("میانگین R روز", "average R of the day"), fmt: (v) => `${v > 0 ? "+" : ""}${r1(v)}R`, good: "high", minDiff: 0.5 },
  dayWin: { domain: "trading", label: () => tr("نرخ برد روز", "daily win rate"), fmt: pctFmt, good: "high", minDiff: 20 },
  lastTick: { domain: "routine", label: () => tr("ساعت آخرین تیک روتین", "time of the last routine tick"), fmt: (v) => hhmm(v), good: "low", minDiff: 60 },
  workoutStart: { domain: "fitness", label: () => tr("ساعت شروع تمرین", "workout start time"), fmt: (v) => hhmm(v), good: "none", minDiff: 60 },
};

export const CONN_METRIC_KEYS = Object.keys(METRICS) as MetricKey[];
export const connMetricDomain = (k: MetricKey): ConnDomain => METRICS[k].domain;

// ───────────────────────── قرارداد ورودی / خروجی ─────────────────────────
export type ConnDay = {
  date: string; // YYYY-MM-DD محلی
  /** JS getDay() همون تاریخ (0=یکشنبه ... 6=شنبه) */
  jsDay: number;
  m: Partial<Record<MetricKey, number | null>>;
};

export type ConnTrade = {
  date: string; // روز محلی
  minute: number; // دقیقه‌ی روز محلی ورود
  openedMs: number;
  closedMs: number | null;
  /** true = برد، false = باخت، null = سر به سر/نامشخص */
  win: boolean | null;
  r: number | null;
  checklistFull: boolean | null;
  followedPlan: boolean | null;
  hasStop: boolean | null;
};

export type ConnInput = {
  /** پنجره‌ی روزها به ترتیب زمان؛ آخرین هفته = هفته‌ی جاری */
  days: ConnDay[];
  weekStart: string;
  /** امتیاز هر روز هفته‌ی جاری (برای توضیح بهترین/بدترین روز) */
  weekScores: { date: string; score: number | null }[];
  trades: ConnTrade[];
};

export type ConnKind = "link" | "time" | "weekday" | "day" | "trade";

export type Connection = {
  id: string;
  kind: ConnKind;
  /** دامنه‌هایی که یافته بهشون وصله (اولی برای برچسب) */
  domains: ConnDomain[];
  tone: "good" | "bad" | "neutral";
  title: string;
  body: string;
  /** برای رتبه‌بندی، 0..1 */
  strength: number;
  /** تعداد روز/معامله‌ی پشت یافته */
  n: number;
};

export type ConnectionsBlock = {
  v: 1;
  items: Connection[];
  /** تعداد روزهای دارای هر نوع داده در پنجره */
  windowDays: number;
};

// ───────────────────────── آمار پایه ─────────────────────────
export const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length / 2;
  return s.length % 2 ? s[Math.floor(h)] : (s[h - 1] + s[h]) / 2;
}
export function stdev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
/** ضریب پیرسون؛ null وقتی واریانس صفره یا نمونه کمتر از 3 تاست */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = mean(xs)!;
  const my = mean(ys)!;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

const val = (d: ConnDay | undefined, k: MetricKey): number | null => {
  const v = d?.m[k];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

// ───────────────────────── جفت‌ها ─────────────────────────
type PairDef = { x: MetricKey; y: MetricKey; lag: 0 | 1; thr?: number };

const PAIRS: PairDef[] = [
  { x: "sleepHours", y: "routinePct", lag: 0, thr: 7 },
  { x: "sleepHours", y: "tasksPct", lag: 0, thr: 7 },
  { x: "sleepHours", y: "workout", lag: 0, thr: 7 },
  { x: "sleepHours", y: "kcalOff", lag: 0, thr: 7 },
  { x: "sleepHours", y: "medPct", lag: 0, thr: 7 },
  { x: "sleepHours", y: "checklistPct", lag: 0, thr: 7 },
  { x: "sleepHours", y: "planPct", lag: 0, thr: 7 },
  { x: "sleepHours", y: "tradeCount", lag: 0, thr: 7 },
  { x: "sleepHours", y: "dayWin", lag: 0, thr: 7 },
  { x: "sleepQuality", y: "routinePct", lag: 0 },
  { x: "awakenings", y: "routinePct", lag: 0 },
  { x: "latency", y: "routinePct", lag: 0 },
  { x: "bedtime", y: "routinePct", lag: 0 },
  { x: "medPct", y: "routinePct", lag: 0 },
  { x: "routinePct", y: "checklistPct", lag: 0 },
  { x: "routinePct", y: "planPct", lag: 0 },
  { x: "tradeCount", y: "dayWin", lag: 0 },
  { x: "tradeCount", y: "tradeR", lag: 0 },
  // اثر فعالیت یک روز روی شب بعدش (ردیف خواب با روز بیدارشدن ثبت می‌شه)
  { x: "workout", y: "sleepHours", lag: 1 },
  { x: "workoutStart", y: "bedtime", lag: 1 },
  { x: "lastTick", y: "bedtime", lag: 1 },
  { x: "lastTick", y: "sleepHours", lag: 1 },
  { x: "tradeCount", y: "sleepHours", lag: 1 },
  { x: "kcalOff", y: "sleepQuality", lag: 1 },
];

function nextDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

type PairResult = {
  def: PairDef;
  n: number;
  r: number;
  thr: number;
  hiMean: number;
  loMean: number;
  hiN: number;
  loN: number;
  weekHits: number;
  weekTotal: number;
};

export function analyzePair(def: PairDef, days: ConnDay[], weekStart: string): PairResult | null {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const rows: { x: number; y: number; date: string }[] = [];
  for (const d of days) {
    const x = val(d, def.x);
    const y = val(def.lag ? byDate.get(nextDate(d.date)) : d, def.y);
    if (x != null && y != null) rows.push({ x, y, date: d.date });
  }
  if (rows.length < CONN_MIN_PAIRS) return null;
  const xs = rows.map((r) => r.x), ys = rows.map((r) => r.y);
  const r = pearson(xs, ys);
  if (r == null || Math.abs(r) < CONN_MIN_R) return null;

  const split = (thr: number) => ({ hi: rows.filter((p) => p.x >= thr), lo: rows.filter((p) => p.x < thr) });
  let thr = def.thr ?? median(xs)!;
  let { hi, lo } = split(thr);
  if (hi.length < CONN_MIN_GROUP || lo.length < CONN_MIN_GROUP) {
    // آستانه‌ی ثابت گروه‌ها رو نامتعادل کرد: میانه
    thr = median(xs)!;
    ({ hi, lo } = split(thr));
    if (hi.length < CONN_MIN_GROUP || lo.length < CONN_MIN_GROUP) {
      // میانه روی مقدارهای تکراری همه رو یک طرف ریخت: میانگین
      thr = mean(xs)!;
      ({ hi, lo } = split(thr));
    }
  }
  if (hi.length < CONN_MIN_GROUP || lo.length < CONN_MIN_GROUP) return null;
  const hiMean = mean(hi.map((p) => p.y))!;
  const loMean = mean(lo.map((p) => p.y))!;
  const diff = hiMean - loMean;
  if (Math.abs(diff) < METRICS[def.y].minDiff) return null;
  if (Math.sign(diff) !== Math.sign(r)) return null; // نشانه‌ی r و اختلاف گروه‌ها باید هم‌جهت باشن

  // این هفته هم همین الگو بود؟ (روزهایی که y بالاتر/پایین‌تر از میانگین کلی‌اش بود)
  const my = mean(ys)!;
  let weekHits = 0, weekTotal = 0;
  for (const p of rows) {
    if (p.date < weekStart) continue;
    weekTotal++;
    const highSide = p.x >= thr;
    const above = p.y >= my;
    if (diff > 0 ? highSide === above : highSide !== above) weekHits++;
  }
  return { def, n: rows.length, r, thr, hiMean, loMean, hiN: hi.length, loN: lo.length, weekHits, weekTotal };
}

function toneOf(res: PairResult): "good" | "bad" | "neutral" {
  const yg = METRICS[res.def.y].good;
  const xg = METRICS[res.def.x].good;
  if (yg === "none" || xg === "none") return "neutral";
  const hiBetterY = yg === "high" ? res.hiMean > res.loMean : res.hiMean < res.loMean;
  const hiBetterX = xg === "high";
  // عادت خوب با نتیجه‌ی بهتر = تشویقی؛ عادت بد با نتیجه‌ی بدتر = هشدار؛ ناهم‌سو = خنثی
  if (hiBetterY !== hiBetterX) return "neutral";
  return hiBetterX ? "good" : "bad";
}

function pairText(res: PairResult): { title: string; body: string } {
  const { def } = res;
  const X = METRICS[def.x], Y = METRICS[def.y];
  const hiY = Y.fmt(res.hiMean), loY = Y.fmt(res.loMean);
  const xt = X.fmt(res.thr);
  const next = def.lag === 1;
  const title = next
    ? tr(`${X.label()} و ${Y.label()} فردایش`, `${X.label()} and ${Y.label()} the next day`)
    : tr(`${X.label()} و ${Y.label()}`, `${X.label()} and ${Y.label()}`);
  // عبارت «گروه بالا / پایین» برای x: ساعت‌ها «دیرتر از»، تمرین «انجام شد/نشد»، بقیه «حداقل»
  const timeX = def.x === "bedtime" || def.x === "lastTick" || def.x === "workoutStart";
  const hiPhrase = def.x === "workout"
    ? tr("تمرین کردی", "you worked out")
    : timeX ? tr(`${X.label()} دیرتر از ${xt} بود`, `${X.label()} was later than ${xt}`) : tr(`${X.label()} حداقل ${xt} بود`, `${X.label()} was at least ${xt}`);
  const loPhrase = def.x === "workout" ? tr("تمرین نکردی", "you did not") : timeX ? tr("زودتر بود", "earlier") : tr("کمتر بود", "lower");
  const yWhen = next ? tr(`${Y.label()} فردایش`, `${Y.label()} the next day`) : Y.label();
  let body = tr(
    `در روزهایی که ${hiPhrase}، ${yWhen} به‌طور میانگین ${hiY} بود و وقتی ${loPhrase} ${loY}.`,
    `On days when ${hiPhrase}, ${yWhen} averaged ${hiY}; when ${loPhrase}, ${loY}.`,
  );
  if (res.weekTotal >= 3) {
    body += " " + tr(
      `این هفته هم در ${res.weekHits} از ${res.weekTotal} روز همین الگو دیده شد. این فقط یک مشاهده از داده‌ی خودته، نه دلیل قطعی.`,
      `This week the same pattern showed on ${res.weekHits} of ${res.weekTotal} days. This is only an observation from your own data, not a proven cause.`,
    );
  }
  return { title, body };
}

const strengthOf = (r: number, n: number) => Math.min(1, Math.abs(r)) * Math.min(1, n / 20);

// ───────────────────────── الگوی روز هفته ─────────────────────────
const DOW_METRICS: MetricKey[] = ["routinePct", "workout", "checklistPct", "dayWin", "sleepHours"];
const DOW_MIN_TOTAL = 14;
const DOW_MIN_GROUP = 3;
const DOW_FACTOR = 1.2;

export function weekdayPatterns(days: ConnDay[]): Connection[] {
  const out: Connection[] = [];
  for (const k of DOW_METRICS) {
    const def = METRICS[k];
    const pts = days.map((d) => ({ jsDay: d.jsDay, v: val(d, k) })).filter((p): p is { jsDay: number; v: number } => p.v != null);
    if (pts.length < DOW_MIN_TOTAL) continue;
    let best: { jsDay: number; dev: number; own: number; rest: number; n: number } | null = null;
    for (let wd = 0; wd < 7; wd++) {
      const own = pts.filter((p) => p.jsDay === wd).map((p) => p.v);
      const rest = pts.filter((p) => p.jsDay !== wd).map((p) => p.v);
      if (own.length < DOW_MIN_GROUP || rest.length < DOW_MIN_GROUP) continue;
      const dev = mean(own)! - mean(rest)!;
      if (Math.abs(dev) < def.minDiff * DOW_FACTOR) continue;
      if (!best || Math.abs(dev) > Math.abs(best.dev)) best = { jsDay: wd, dev, own: mean(own)!, rest: mean(rest)!, n: own.length };
    }
    if (!best) continue;
    const wdName = weekdayName(best.jsDay);
    const low = best.dev < 0;
    const tone = def.good === "none" ? "neutral" : (def.good === "high") === !low ? "good" : "bad";
    out.push({
      id: `dow-${k}`,
      kind: "weekday",
      domains: [def.domain],
      tone,
      title: low ? tr(`${wdName}، پایین‌ترین روز ${def.label()}`, `${wdName}: your lowest day for ${def.label()}`) : tr(`${wdName}، بهترین روز ${def.label()}`, `${wdName}: your highest day for ${def.label()}`),
      body: tr(
        `در ${pts.length} روز اخیر، ${def.label()} در ${wdName}ها به‌طور میانگین ${def.fmt(best.own)} بود و در بقیه‌ی روزها ${def.fmt(best.rest)}.`,
        `Over the last ${pts.length} days, ${def.label()} averaged ${def.fmt(best.own)} on ${wdName}s versus ${def.fmt(best.rest)} on other days.`,
      ),
      strength: Math.min(1, Math.abs(best.dev) / (def.minDiff * 3)) * Math.min(1, pts.length / 28),
      n: pts.length,
    });
  }
  return out.sort((a, b) => b.strength - a.strength).slice(0, 2);
}

// ───────────────────────── الگوهای ساعت‌محور (رفتار غیرفعال) ─────────────────────────
export const LATE_TICK_MIN = 21 * 60;
export const LATE_WORKOUT_MIN = 20 * 60;

export function timePatterns(days: ConnDay[]): Connection[] {
  const out: Connection[] = [];

  const ticks = days.map((d) => val(d, "lastTick")).filter((v): v is number => v != null);
  if (ticks.length >= 7) {
    const late = ticks.filter((v) => v >= LATE_TICK_MIN).length;
    const share = late / ticks.length;
    const med = median(ticks)!;
    if (share >= 0.5) {
      out.push({
        id: "time-late-ticks",
        kind: "time",
        domains: ["routine"],
        tone: "neutral",
        title: tr("بیشتر برنامه‌ها آخر شب تیک می‌خورن", "Most programs get ticked late at night"),
        body: tr(
          `در ${late} از ${ticks.length} روز اخیر، آخرین تیک روتین بعد از 21:00 خورده؛ میانه‌ی ساعت آخرین تیک ${hhmm(med)} بود.`,
          `On ${late} of the last ${ticks.length} days your last routine tick came after 21:00; the median time of the last tick was ${hhmm(med)}.`,
        ),
        strength: share * Math.min(1, ticks.length / 20),
        n: ticks.length,
      });
    } else if (share <= 0.1 && med <= 18 * 60) {
      out.push({
        id: "time-early-ticks",
        kind: "time",
        domains: ["routine"],
        tone: "good",
        title: tr("روتینت زود جمع می‌شه", "You wrap up your routine early"),
        body: tr(
          `میانه‌ی ساعت آخرین تیک روتین در ${ticks.length} روز اخیر ${hhmm(med)} بود و فقط ${late} روز بعد از 21:00.`,
          `The median time of your last routine tick over ${ticks.length} days was ${hhmm(med)}, and only ${late} days went past 21:00.`,
        ),
        strength: 0.4 * Math.min(1, ticks.length / 20),
        n: ticks.length,
      });
    }
  }

  const starts = days.map((d) => val(d, "workoutStart")).filter((v): v is number => v != null);
  if (starts.length >= 4) {
    const late = starts.filter((v) => v >= LATE_WORKOUT_MIN).length;
    if (late / starts.length >= 0.6) {
      out.push({
        id: "time-late-workout",
        kind: "time",
        domains: ["fitness"],
        tone: "neutral",
        title: tr("تمرین‌هات دیروقت شروع می‌شن", "Your workouts start late in the evening"),
        body: tr(
          `${late} از ${starts.length} جلسه‌ی اخیر بعد از 20:00 شروع شد؛ میانه‌ی ساعت شروع ${hhmm(median(starts)!)}.`,
          `${late} of your last ${starts.length} sessions started after 20:00; the median start time was ${hhmm(median(starts)!)}.`,
        ),
        strength: (late / starts.length) * Math.min(1, starts.length / 10),
        n: starts.length,
      });
    }
  }

  const beds = days.map((d) => val(d, "bedtime")).filter((v): v is number => v != null);
  if (beds.length >= 7) {
    const sd = stdev(beds)!;
    if (sd >= 60) {
      out.push({
        id: "time-bedtime-irregular",
        kind: "time",
        domains: ["sleep"],
        tone: "bad",
        title: tr("ساعت خواب‌رفتنت پراکنده‌ست", "Your bedtime is scattered"),
        body: tr(
          `ساعت خواب‌رفتن در ${beds.length} شب اخیر حدود ±${r0(sd)} دقیقه نوسان داشته (میانه ${hhmm(median(beds)! + BEDTIME_SHIFT)}). ساعت منظم‌تر معمولا خواب پایدارتری می‌ده.`,
          `Across ${beds.length} recent nights your bedtime varied by about ±${r0(sd)} minutes (median ${hhmm(median(beds)! + BEDTIME_SHIFT)}). A steadier schedule usually supports steadier sleep.`,
        ),
        strength: Math.min(1, sd / 120) * Math.min(1, beds.length / 20),
        n: beds.length,
      });
    } else if (sd <= 30 && beds.length >= 10) {
      out.push({
        id: "time-bedtime-regular",
        kind: "time",
        domains: ["sleep"],
        tone: "good",
        title: tr("ساعت خواب‌رفتنت منظمه", "Your bedtime is steady"),
        body: tr(
          `ساعت خواب‌رفتن در ${beds.length} شب اخیر فقط ±${r0(sd)} دقیقه نوسان داشته (میانه ${hhmm(median(beds)! + BEDTIME_SHIFT)}).`,
          `Across ${beds.length} recent nights your bedtime varied by only ±${r0(sd)} minutes (median ${hhmm(median(beds)! + BEDTIME_SHIFT)}).`,
        ),
        strength: 0.45 * Math.min(1, beds.length / 20),
        n: beds.length,
      });
    }
  }
  return out;
}

// ───────────────────────── تقسیم‌های معامله‌ای ─────────────────────────
const winRate = (ts: ConnTrade[]): { rate: number; n: number } | null => {
  const dec = ts.filter((t) => t.win !== null);
  return dec.length ? { rate: (dec.filter((t) => t.win).length / dec.length) * 100, n: dec.length } : null;
};

type SplitSpec = { id: string; yes: (t: ConnTrade) => boolean | null; yesLabel: () => string; noLabel: () => string; title: () => string; domain: ConnDomain };

const SPLITS: SplitSpec[] = [
  {
    id: "checklist", yes: (t) => t.checklistFull, domain: "trading",
    yesLabel: () => tr("با چک‌لیست کامل", "with a full checklist"), noLabel: () => tr("بدون چک‌لیست کامل", "without a full checklist"),
    title: () => tr("چک‌لیست کامل و نتیجه‌ی معامله", "Full checklist and trade outcome"),
  },
  {
    id: "plan", yes: (t) => t.followedPlan, domain: "trading",
    yesLabel: () => tr("طبق پلن", "on plan"), noLabel: () => tr("خارج از پلن", "off plan"),
    title: () => tr("پایبندی به پلن و نتیجه‌ی معامله", "Plan adherence and trade outcome"),
  },
  {
    id: "stop", yes: (t) => t.hasStop, domain: "trading",
    yesLabel: () => tr("با حدضرر", "with a stop"), noLabel: () => tr("بدون حدضرر", "without a stop"),
    title: () => tr("حدضرر و نتیجه‌ی معامله", "Stop loss and trade outcome"),
  },
];

const MIN_WIN_DIFF = 20;

export function tradeSplits(trades: ConnTrade[]): Connection[] {
  const out: Connection[] = [];
  if (trades.filter((t) => t.win !== null).length < CONN_MIN_TRADES) return out;
  for (const s of SPLITS) {
    const yes = trades.filter((t) => s.yes(t) === true);
    const no = trades.filter((t) => s.yes(t) === false);
    const a = winRate(yes), b = winRate(no);
    if (!a || !b || a.n < CONN_MIN_TRADE_GROUP || b.n < CONN_MIN_TRADE_GROUP) continue;
    const diff = a.rate - b.rate;
    if (Math.abs(diff) < MIN_WIN_DIFF) continue;
    out.push({
      id: `trade-${s.id}`,
      kind: "trade",
      domains: [s.domain],
      tone: diff > 0 ? "good" : "bad",
      title: s.title(),
      body: tr(
        `در ${a.n + b.n} معامله‌ی اخیر، نرخ برد معامله‌های ${s.yesLabel()} ${r0(a.rate)}% بود و ${s.noLabel()} ${r0(b.rate)}%.`,
        `Across your last ${a.n + b.n} trades, the win rate ${s.yesLabel()} was ${r0(a.rate)}% versus ${r0(b.rate)}% ${s.noLabel()}.`,
      ),
      strength: Math.min(1, Math.abs(diff) / 50) * Math.min(1, (a.n + b.n) / 30),
      n: a.n + b.n,
    });
  }
  return out;
}

type HourBand = { key: string; from: number; to: number; label: () => string };
const BANDS: HourBand[] = [
  { key: "am", from: 0, to: 11 * 60, label: () => tr("قبل از 11", "before 11:00") },
  { key: "mid", from: 11 * 60, to: 15 * 60, label: () => tr("بین 11 تا 15", "between 11:00 and 15:00") },
  { key: "pm", from: 15 * 60, to: 19 * 60, label: () => tr("بین 15 تا 19", "between 15:00 and 19:00") },
  { key: "late", from: 19 * 60, to: 1440, label: () => tr("بعد از 19", "after 19:00") },
];

export function tradeHourPattern(trades: ConnTrade[]): Connection | null {
  if (trades.filter((t) => t.win !== null).length < CONN_MIN_TRADES) return null;
  const rated = BANDS.map((b) => ({ b, w: winRate(trades.filter((t) => t.minute >= b.from && t.minute < b.to)) }))
    .filter((x): x is { b: HourBand; w: { rate: number; n: number } } => !!x.w && x.w.n >= CONN_MIN_TRADE_GROUP);
  if (rated.length < 2) return null;
  const sorted = [...rated].sort((a, b) => b.w.rate - a.w.rate);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  if (best.w.rate - worst.w.rate < MIN_WIN_DIFF + 5) return null;
  return {
    id: "trade-hour",
    kind: "trade",
    domains: ["trading"],
    tone: "neutral",
    title: tr("ساعت ورود و نتیجه", "Entry time and outcome"),
    body: tr(
      `معامله‌های ${best.b.label()} نرخ برد ${r0(best.w.rate)}% داشتن (${best.w.n} معامله) و معامله‌های ${worst.b.label()} ${r0(worst.w.rate)}% (${worst.w.n} معامله).`,
      `Trades entered ${best.b.label()} won ${r0(best.w.rate)}% (${best.w.n} trades) while trades entered ${worst.b.label()} won ${r0(worst.w.rate)}% (${worst.w.n} trades).`,
    ),
    strength: Math.min(1, (best.w.rate - worst.w.rate) / 60) * Math.min(1, (best.w.n + worst.w.n) / 30),
    n: best.w.n + worst.w.n,
  };
}

/** معامله‌ی «بعد از ضرر»: ورود در 2 ساعت پس از بسته‌شدن یک معامله‌ی بازنده */
export const AFTER_LOSS_MS = 2 * 3_600_000;

export function afterLossPattern(trades: ConnTrade[]): Connection | null {
  const sorted = [...trades].sort((a, b) => a.openedMs - b.openedMs);
  const after: ConnTrade[] = [];
  const other: ConnTrade[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const isAfter = !!prev && prev.win === false && t.openedMs - (prev.closedMs ?? prev.openedMs) <= AFTER_LOSS_MS && t.openedMs >= (prev.closedMs ?? prev.openedMs);
    (isAfter ? after : other).push(t);
  }
  const a = winRate(after), b = winRate(other);
  if (!a || !b || a.n < CONN_MIN_TRADE_GROUP + 1 || b.n < CONN_MIN_TRADE_GROUP) return null;
  const diff = a.rate - b.rate;
  if (diff > -MIN_WIN_DIFF) return null;
  return {
    id: "trade-after-loss",
    kind: "trade",
    domains: ["trading"],
    tone: "bad",
    title: tr("معامله‌ی فوری بعد از ضرر", "Trading right after a loss"),
    body: tr(
      `معامله‌هایی که در 2 ساعت بعد از یک ضرر وارد شدن (${a.n} معامله) نرخ برد ${r0(a.rate)}% داشتن؛ بقیه ${r0(b.rate)}%. شاید یک وقفه‌ی کوتاه بعد از ضرر کمک کنه.`,
      `Trades entered within 2 hours after a loss (${a.n} trades) won ${r0(a.rate)}% versus ${r0(b.rate)}% for the rest. A short pause after a loss might help.`,
    ),
    strength: Math.min(1, Math.abs(diff) / 50) * Math.min(1, (a.n + b.n) / 30),
    n: a.n + b.n,
  };
}

// ───────────────────────── توضیح بهترین و بدترین روز ─────────────────────────
const EXPLAIN_KEYS: MetricKey[] = [
  "sleepHours", "sleepQuality", "bedtime", "medPct", "kcalOff", "protein", "workout", "lastTick", "tradeCount", "checklistPct", "planPct",
];
const EXPLAIN_MIN_BASE = 8;
const EXPLAIN_MIN_SCORE_GAP = 15;

export function explainDay(days: ConnDay[], date: string, kind: "best" | "worst"): Connection | null {
  const day = days.find((d) => d.date === date);
  if (!day) return null;
  const cands: { k: MetricKey; z: number; v: number; base: number }[] = [];
  for (const k of EXPLAIN_KEYS) {
    const v = val(day, k);
    if (v == null) continue;
    const base = days.filter((d) => d.date !== date).map((d) => val(d, k)).filter((x): x is number => x != null);
    if (base.length < EXPLAIN_MIN_BASE) continue;
    const sd = stdev(base);
    const m = mean(base)!;
    if (!sd || sd === 0) continue;
    const z = (v - m) / sd;
    if (Math.abs(z) < 1 || Math.abs(v - m) < METRICS[k].minDiff) continue;
    cands.push({ k, z, v, base: m });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const top = cands.slice(0, 3);
  const wd = weekdayName(day.jsDay);
  const parts = top.map((c) => tr(
    `${METRICS[c.k].label()} ${METRICS[c.k].fmt(c.v)} (معمولا ${METRICS[c.k].fmt(c.base)})`,
    `${METRICS[c.k].label()} ${METRICS[c.k].fmt(c.v)} (usually ${METRICS[c.k].fmt(c.base)})`,
  ));
  const list = parts.join(tr("، ", ", "));
  return {
    id: `day-${kind}`,
    kind: "day",
    domains: [...new Set(top.map((c) => METRICS[c.k].domain))],
    tone: kind === "best" ? "good" : "bad",
    title: kind === "best" ? tr(`چی ${wd} رو بهترین روز کرد`, `What stood out on your best day, ${wd}`) : tr(`چی ${wd} رو سخت‌ترین روز کرد`, `What stood out on your hardest day, ${wd}`),
    body: tr(`در این روز ${list}. هم‌زمانی لزوما علت نیست، فقط چیزهایی که از عادت معمولت فاصله داشتن.`, `That day: ${list}. Coincidence is not proof of cause; these are just the things that differed from your usual.`),
    strength: Math.min(1, Math.abs(top[0].z) / 3) * 0.8,
    n: top.length,
  };
}

function dayExplanations(input: ConnInput): Connection[] {
  const scored = input.weekScores.filter((d): d is { date: string; score: number } => d.score != null);
  if (scored.length < 3) return [];
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  const worst = scored.reduce((a, b) => (b.score < a.score ? b : a));
  if (best.score - worst.score < EXPLAIN_MIN_SCORE_GAP) return [];
  const out: Connection[] = [];
  const b = explainDay(input.days, best.date, "best");
  const w = explainDay(input.days, worst.date, "worst");
  if (b) out.push(b);
  if (w) out.push(w);
  return out;
}

// ───────────────────────── نقطه‌ی ورود ─────────────────────────
/** نوع دسته‌ها در خروجی: رابطه‌ها اول، بعد روز هفته و ساعت، بعد ترید و روزها؛ سقف کل CONN_MAX_ITEMS */
export function computeConnections(input: ConnInput): ConnectionsBlock {
  const links: Connection[] = [];
  for (const def of PAIRS) {
    const res = analyzePair(def, input.days, input.weekStart);
    if (!res) continue;
    const t = pairText(res);
    links.push({
      id: `link-${def.x}-${def.y}-${def.lag}`,
      kind: "link",
      domains: [...new Set([METRICS[def.x].domain, METRICS[def.y].domain])],
      tone: toneOf(res),
      title: t.title,
      body: t.body,
      strength: strengthOf(res.r, res.n),
      n: res.n,
    });
  }
  // برای هر متریک خروجی حداکثر دو رابطه، تا یک موضوع همه‌ی جا رو نگیره
  links.sort((a, b) => b.strength - a.strength);
  const perY = new Map<string, number>();
  const pairItems: Connection[] = [];
  for (const l of links) {
    const y = l.id.split("-")[2];
    const c = perY.get(y) ?? 0;
    if (c >= 2) continue;
    perY.set(y, c + 1);
    pairItems.push(l);
    if (pairItems.length >= 5) break;
  }

  const rest: Connection[] = [
    ...weekdayPatterns(input.days),
    ...timePatterns(input.days),
    ...tradeSplits(input.trades),
    ...[tradeHourPattern(input.trades), afterLossPattern(input.trades)].filter((x): x is Connection => !!x),
    ...dayExplanations(input),
  ].sort((a, b) => b.strength - a.strength);

  const items: Connection[] = [];
  // رابطه‌ها اول (حداکثر 5)، بعد قوی‌ترین‌های بقیه تا سقف
  for (const it of [...pairItems, ...rest]) {
    if (items.length >= CONN_MAX_ITEMS) break;
    items.push(it);
  }
  return { v: 1, items, windowDays: input.days.length };
}
