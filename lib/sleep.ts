// خواب — منطق خالص مشترک کلاینت و سرور (بدون fetch/prisma). صفحه و سیستم
// جدای خودش (/sleep)، جدا از صفحه‌ی روتین.
//
// معماری:
//   • هر شب یک SleepEntry با کلید (userId, date)؛ date = روز *بیدارشدن*.
//   • زمان‌ها ISO  کامل ذخیره می‌شن؛ کاربر فقط «ساعت خواب» و «ساعت بیداری»
//     وارد می‌کنه و buildSleepTimes لحظه‌ی واقعی رو می‌سازه (خواب قبل از
//     نیمه‌شب مال دیروزه).
//   • هدف از همون wakeSleepTimes  «روتین من» میاد (یک منبع برای ساعت بیداری/خواب).
//   • persistence از lib/storage.ts (مهمان → localStorage، کاربر → /api/sleep).
//   • اچیومنت‌های خواب (lib/achievements.ts) از همین ردیف‌ها سمت سرور حساب می‌شن.

export type SleepRecord = {
  /** روز بیدارشدن YYYY-MM-DD */
  date: string;
  sleptAt: string;
  wokeAt: string;
  quality: number | null;
  note: string | null;
  /** دقیقه تا به خواب رفتن (اختیاری) */
  latencyMin?: number | null;
  /** دفعات بیدارشدن وسط شب (اختیاری) */
  awakenings?: number | null;
  /** چرت روز قبل، دقیقه (اختیاری) */
  napMin?: number | null;
  /** کلیدهای SLEEP_TAGS */
  tags?: string[];
};

export const SLEEP_MIN_MIN = 30;
export const SLEEP_MAX_MIN = 20 * 60;
/** بازه‌ی سالم (دقیقه) — هم‌راستا با اچیومنت «خواب کافی» */
export const SLEEP_GOAL_MIN = 7 * 60;
export const SLEEP_GOAL_MAX = 9 * 60;

function hm(v: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h > 23 || mi > 59 ? null : [h, mi];
}

/**
 * از «روز بیداری» + ساعت‌های HH:mm، دو لحظه‌ی واقعی (محلی) می‌سازه. اگه ساعت
 * خواب از ساعت بیداری دیرتر باشه (مثلا 23:30 → 07:00) خواب مال شب قبله.
 */
export function buildSleepTimes(wakeDateIso: string, bed: string, wake: string): { sleptAt: Date; wokeAt: Date } | null {
  const b = hm(bed), w = hm(wake);
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wakeDateIso);
  if (!b || !w || !dm) return null;
  const [y, mo, d] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const wokeAt = new Date(y, mo - 1, d, w[0], w[1]);
  let sleptAt = new Date(y, mo - 1, d, b[0], b[1]);
  if (sleptAt >= wokeAt) sleptAt = new Date(y, mo - 1, d - 1, b[0], b[1]);
  return { sleptAt, wokeAt };
}

/**
 * جای میله‌ی «خواب→بیداری» روی محور عمودی نمودار (دقیقه از axisStart).
 * ساعت خواب بین 12:00 و axisStart (مثلا 18:00) «زودتر از شروع محور» حساب می‌شه،
 * نه «دیرتر از پایان محور» — وگرنه خواب زودهنگام ته نمودار گم می‌شد.
 */
export function timelineSpan(bedMin: number, durMin: number, axisStart: number, axisSpan: number): { from: number; to: number } {
  let s = (((bedMin - axisStart) % 1440) + 1440) % 1440;
  if (s > 1440 - (1440 - axisSpan) / 2) s -= 1440;
  const from = Math.min(Math.max(s, 0), axisSpan);
  const to = Math.min(Math.max(s + durMin, 0), axisSpan);
  return { from, to };
}

export function sleepMinutes(r: Pick<SleepRecord, "sleptAt" | "wokeAt">): number {
  return Math.round((new Date(r.wokeAt).getTime() - new Date(r.sleptAt).getTime()) / 60000);
}

export function clockOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** «7 ساعت و 20 دقیقه» */
export function durationLabel(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} دقیقه`;
  return m ? `${h} ساعت و ${m} دقیقه` : `${h} ساعت`;
}

/** میانگین دایره‌ای ساعت‌ها (میانگین 23:00 و 01:00 = 00:00، نه 12:00) */
export function circularMeanMinutes(mins: number[]): number | null {
  if (!mins.length) return null;
  let x = 0, y = 0;
  for (const m of mins) {
    const a = (m / 1440) * 2 * Math.PI;
    x += Math.cos(a);
    y += Math.sin(a);
  }
  const a = Math.atan2(y / mins.length, x / mins.length);
  return Math.round((((a / (2 * Math.PI)) * 1440) + 1440) % 1440);
}

export function minutesToClock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export type SleepSummary = {
  nights: number;
  avgMin: number | null;
  avgBed: string | null;
  avgWake: string | null;
  /** درصد شب‌هایی که بین ۷ تا ۹ ساعت بوده */
  goalPct: number | null;
  /** ۰..۱۰۰ — هرچی ساعت خواب ثابت‌تر، بالاتر (بر اساس انحراف دایره‌ای از میانگین) */
  consistency: number | null;
  /** بدهی خواب نسبت به ۸ ساعت در همین بازه (دقیقه، ≥۰) */
  debtMin: number;
};

export function summarizeSleep(entries: SleepRecord[]): SleepSummary {
  const list = entries.filter((e) => sleepMinutes(e) > 0);
  if (!list.length) return { nights: 0, avgMin: null, avgBed: null, avgWake: null, goalPct: null, consistency: null, debtMin: 0 };
  const durs = list.map(sleepMinutes);
  const beds = list.map((e) => { const d = new Date(e.sleptAt); return d.getHours() * 60 + d.getMinutes(); });
  const wakes = list.map((e) => { const d = new Date(e.wokeAt); return d.getHours() * 60 + d.getMinutes(); });
  const meanBed = circularMeanMinutes(beds)!;
  const dev = beds.reduce((s, b) => { const d = Math.abs(b - meanBed) % 1440; return s + Math.min(d, 1440 - d); }, 0) / beds.length;
  return {
    nights: list.length,
    avgMin: Math.round(durs.reduce((s, x) => s + x, 0) / durs.length),
    avgBed: minutesToClock(meanBed),
    avgWake: minutesToClock(circularMeanMinutes(wakes)!),
    goalPct: Math.round((durs.filter((x) => x >= SLEEP_GOAL_MIN && x <= SLEEP_GOAL_MAX).length / durs.length) * 100),
    // ۰ دقیقه انحراف → ۱۰۰، ۹۰ دقیقه یا بیشتر → ۰
    consistency: Math.max(0, Math.round(100 - (dev / 90) * 100)),
    debtMin: Math.max(0, durs.reduce((s, x) => s + (480 - x), 0)),
  };
}

// ── بازسازی بخش خواب: امتیاز، تحلیل‌ها، چرخه‌ها ─────────────────────────────

export const LATENCY_MAX = 240;
export const AWAKENINGS_MAX = 20;
export const NAP_MAX = 240;

/** عوامل قابل برچسب‌زدن روی هر شب — effect انتظار کلی (فقط برای رنگ/ترتیب UI) */
export const SLEEP_TAGS = [
  { key: "caffeine", label: "کافئین عصر", effect: "bad" },
  { key: "screen", label: "گوشی قبل خواب", effect: "bad" },
  { key: "late_meal", label: "شام دیر", effect: "bad" },
  { key: "stress", label: "استرس", effect: "bad" },
  { key: "noise", label: "سروصدا", effect: "bad" },
  { key: "sick", label: "بیماری", effect: "bad" },
  { key: "travel", label: "سفر", effect: "bad" },
  { key: "exercise", label: "ورزش", effect: "good" },
  { key: "reading", label: "مطالعه", effect: "good" },
  { key: "meditation", label: "مدیتیشن", effect: "good" },
  { key: "dark_room", label: "اتاق تاریک", effect: "good" },
  { key: "early_dinner", label: "شام سبک", effect: "good" },
] as const;
export type SleepTagKey = (typeof SLEEP_TAGS)[number]["key"];
const TAG_KEYS = new Set<string>(SLEEP_TAGS.map((t) => t.key));

export function sanitizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const t of raw) if (typeof t === "string" && TAG_KEYS.has(t) && !out.includes(t)) out.push(t);
  return out;
}

export function tagLabel(key: string): string {
  return SLEEP_TAGS.find((t) => t.key === key)?.label ?? key;
}

/** دقیقه از نیمه‌شب برای یک ISO (ساعت محلی) */
export function minuteOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** فاصله‌ی دایره‌ای دو ساعت (دقیقه، 0..720) */
export function clockDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

/**
 * هدف مدت خواب از ساعت‌های هدف «روتین من» (wakeSleepTimes): فاصله‌ی خواب تا
 * بیداری، محدود به 6 تا 10 ساعت. یک منبع: هر جا ساعت خواب/بیداری عوض بشه هدف هم عوض می‌شه.
 */
export function goalFromTargets(t: { wake: string; sleep: string } | null | undefined): number {
  const w = t ? hm(t.wake) : null, b = t ? hm(t.sleep) : null;
  if (!w || !b) return 8 * 60;
  const d = (((w[0] * 60 + w[1]) - (b[0] * 60 + b[1])) % 1440 + 1440) % 1440;
  return Math.min(10 * 60, Math.max(6 * 60, d || 8 * 60));
}

export type SleepScoreParts = {
  /** امتیاز هر بخش 0..100 (null یعنی داده نداره و در وزن حساب نمی‌شه) */
  duration: number;
  timing: number;
  quality: number | null;
  continuity: number | null;
};
export type SleepScore = { score: number; parts: SleepScoreParts };

/**
 * امتیاز خواب یک شب 0..100.
 * - مدت (وزن 45): نزدیکی به هدف؛ هر 15 دقیقه کمتر/بیشتر از ±30 دقیقه حدود 6 امتیاز کم می‌کنه.
 * - زمان‌بندی (وزن 20): فاصله‌ی ساعت خواب از ساعت خواب هدف؛ 0 تا 30 دقیقه کامل، 3 ساعت = 0.
 * - کیفیت (وزن 25): خودارزیابی 1..5.
 * - پیوستگی (وزن 10): زمان به خواب رفتن و دفعات بیدارشدن.
 * بخش‌های بی‌داده حذف و وزن‌ها دوباره نرمال می‌شن (ثبت ساده هم امتیاز منصفانه می‌گیره).
 */
export function sleepScore(rec: SleepRecord, ctx: { goalMin: number; targetBedMin: number | null }): SleepScore {
  const dur = sleepMinutes(rec);
  const off = Math.abs(dur - ctx.goalMin);
  const duration = clamp100(100 - Math.max(0, off - 30) * 0.4);
  const bed = minuteOfDay(rec.sleptAt);
  const tDist = ctx.targetBedMin === null ? 0 : clockDistance(bed, ctx.targetBedMin);
  const timing = clamp100(100 - (Math.max(0, tDist - 30) / 150) * 100);
  const quality = typeof rec.quality === "number" ? clamp100(((rec.quality - 1) / 4) * 100) : null;
  const hasCont = typeof rec.latencyMin === "number" || typeof rec.awakenings === "number";
  const continuity = hasCont
    ? clamp100(100 - Math.max(0, (rec.latencyMin ?? 0) - 15) * 1.2 - (rec.awakenings ?? 0) * 12)
    : null;
  const parts: [number, number | null][] = [[45, duration], [20, timing], [25, quality], [10, continuity]];
  let w = 0, sum = 0;
  for (const [weight, v] of parts) if (v !== null) { w += weight; sum += weight * v; }
  return { score: Math.round(sum / w), parts: { duration, timing, quality, continuity } };
}

function clamp100(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)));
}

export type ScoreBand = "great" | "good" | "fair" | "poor";
export function scoreBand(score: number): ScoreBand {
  return score >= 85 ? "great" : score >= 70 ? "good" : score >= 50 ? "fair" : "poor";
}
export const SCORE_BAND_LABEL: Record<ScoreBand, string> = { great: "عالی", good: "خوب", fair: "متوسط", poor: "ضعیف" };

/** وسط خواب (دقیقه از نیمه‌شب) — پایه‌ی کرونوتایپ و جت‌لگ اجتماعی */
export function midSleepMinute(rec: Pick<SleepRecord, "sleptAt" | "wokeAt">): number {
  const s = new Date(rec.sleptAt).getTime(), w = new Date(rec.wokeAt).getTime();
  const mid = new Date((s + w) / 2);
  return mid.getHours() * 60 + mid.getMinutes();
}

/** شب آزاد (بدون ساعت کاری فردا): بیداری پنجشنبه یا جمعه */
export function isFreeNight(wakeDateIso: string): boolean {
  const [y, m, d] = wakeDateIso.split("-").map(Number);
  const wd = new Date(y, m - 1, d).getDay(); // 5 = جمعه، 4 = پنجشنبه
  return wd === 5 || wd === 4;
}

export type Chronotype = "lark" | "middle" | "owl";
export const CHRONOTYPE_LABEL: Record<Chronotype, string> = { lark: "سحرخیز", middle: "میانه", owl: "شب‌زنده‌دار" };

export type TagImpact = { key: string; label: string; nights: number; avgWith: number; avgWithout: number; delta: number };

export type SleepInsights = SleepSummary & {
  goalMin: number;
  /** امتیاز هر شب به ترتیب تاریخ */
  scores: { date: string; score: number }[];
  avgScore: number | null;
  /** بدهی خواب 7 شب اخیر نسبت به هدف (دقیقه، ≥0) */
  debt7Min: number;
  /** اختلاف وسط خواب شب‌های آزاد و کاری (دقیقه، null اگه داده‌ی کافی نیست) */
  socialJetlagMin: number | null;
  chronotype: Chronotype | null;
  /** ساعت وسط خواب شب‌های آزاد (HH:mm) */
  midSleepFree: string | null;
  /** شب‌های پشت سر هم تا آخرین شب ثبت‌شده با مدت در بازه‌ی هدف ±30 دقیقه */
  goalStreak: number;
  /** بازه‌ی ساعت خوابی که بهترین امتیازها رو داشته (پنجره‌ی 30 دقیقه‌ای) */
  bestBedWindow: { from: string; to: string; avgScore: number; nights: number } | null;
  /** اثر برچسب‌ها بر امتیاز (حداقل 2 شب با و 2 شب بدون)، مرتب‌شده بر اساس شدت اثر */
  tagImpacts: TagImpact[];
  /** روند: میانگین امتیاز 7 شب اخیر منهای 7 شب قبلش */
  trend: number | null;
};

/**
 * همه‌ی تحلیل‌ها یکجا از ردیف‌های یک بازه (معمولا 90 شب اخیر). entries باید
 * مرتب‌شده بر اساس تاریخ باشن؛ todayIso برای «7 شب اخیر» لازمه.
 */
export function sleepInsights(entries: SleepRecord[], target: { wake: string; sleep: string } | null, todayIso: string): SleepInsights {
  const list = entries.filter((e) => sleepMinutes(e) > 0).sort((a, b) => a.date.localeCompare(b.date));
  const base = summarizeSleep(list);
  const goalMin = goalFromTargets(target);
  const tb = target ? hm(target.sleep) : null;
  const targetBedMin = tb ? tb[0] * 60 + tb[1] : null;
  const scores = list.map((e) => ({ date: e.date, score: sleepScore(e, { goalMin, targetBedMin }).score }));
  const avgScore = scores.length ? Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length) : null;

  const from7 = addDaysIso(todayIso, -6);
  const last7 = list.filter((e) => e.date >= from7 && e.date <= todayIso);
  const debt7Min = Math.max(0, last7.reduce((s, e) => s + (goalMin - sleepMinutes(e)), 0));

  const free = list.filter((e) => isFreeNight(e.date)).map(midSleepMinute);
  const work = list.filter((e) => !isFreeNight(e.date)).map(midSleepMinute);
  const mf = circularMeanMinutes(free), mw = circularMeanMinutes(work);
  const socialJetlagMin = free.length >= 2 && work.length >= 3 && mf !== null && mw !== null ? clockDistance(mf, mw) : null;
  // کرونوتایپ از وسط خواب شب‌های آزاد (بدون اجبار ساعت کاری)؛ اگه شب آزاد کم بود از همه
  const midRef = free.length >= 2 ? mf : circularMeanMinutes(list.map(midSleepMinute));
  let chronotype: Chronotype | null = null;
  if (midRef !== null && list.length >= 5) {
    // نسبت به 12 ظهر جابه‌جا تا 2 بامداد < 4:30 < 5:30 ... مقایسه‌ی خطی بشه
    const m = (midRef + 720) % 1440; // 00:00 → 720
    chronotype = m < 720 + 180 ? "lark" : m < 720 + 300 ? "middle" : "owl"; // <3:00 سحرخیز، <5:00 میانه
  }

  let goalStreak = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (i < list.length - 1 && addDaysIso(e.date, 1) !== list[i + 1].date) break;
    if (Math.abs(sleepMinutes(e) - goalMin) <= 30) goalStreak++;
    else break;
  }
  // رشته فقط اگه آخرین شب ثبت‌شده دیشب یا امروز باشه زنده‌ست
  if (list.length && list[list.length - 1].date < addDaysIso(todayIso, -1)) goalStreak = 0;

  // بهترین پنجره‌ی ساعت خواب: سطل‌های 30 دقیقه‌ای، حداقل 2 شب
  const buckets = new Map<number, number[]>();
  list.forEach((e, i) => {
    const b = Math.floor(minuteOfDay(e.sleptAt) / 30) * 30;
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(scores[i].score);
  });
  let bestBedWindow: SleepInsights["bestBedWindow"] = null;
  buckets.forEach((arr, b) => {
    if (arr.length < 2) return;
    const avg = Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
    if (!bestBedWindow || avg > bestBedWindow.avgScore || (avg === bestBedWindow.avgScore && arr.length > bestBedWindow.nights)) {
      bestBedWindow = { from: minutesToClock(b), to: minutesToClock(b + 30), avgScore: avg, nights: arr.length };
    }
  });

  const tagImpacts: TagImpact[] = [];
  for (const t of SLEEP_TAGS) {
    const withT: number[] = [], without: number[] = [];
    list.forEach((e, i) => ((e.tags ?? []).includes(t.key) ? withT : without).push(scores[i].score));
    if (withT.length < 2 || without.length < 2) continue;
    const a = withT.reduce((s, x) => s + x, 0) / withT.length;
    const b = without.reduce((s, x) => s + x, 0) / without.length;
    tagImpacts.push({ key: t.key, label: t.label, nights: withT.length, avgWith: Math.round(a), avgWithout: Math.round(b), delta: Math.round(a - b) });
  }
  tagImpacts.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const s7 = scores.filter((x) => x.date >= from7 && x.date <= todayIso).map((x) => x.score);
  const from14 = addDaysIso(todayIso, -13);
  const p7 = scores.filter((x) => x.date >= from14 && x.date < from7).map((x) => x.score);
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const trend = s7.length >= 3 && p7.length >= 3 ? Math.round(mean(s7) - mean(p7)) : null;

  return {
    ...base,
    goalMin,
    scores,
    avgScore,
    debt7Min,
    socialJetlagMin,
    chronotype,
    midSleepFree: free.length >= 2 && mf !== null ? minutesToClock(mf) : null,
    goalStreak,
    bestBedWindow,
    tagImpacts,
    trend,
  };
}

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const x = new Date(y, m - 1, d + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

// ── چرخه‌های خواب ────────────────────────────────────────────────────
export const CYCLE_MIN = 90;
export const DEFAULT_LATENCY = 15;

/** اگه ساعت bedMin (دقیقه از نیمه‌شب) دراز بکشی، ساعت‌های خوب بیداری (پایان 4 تا 6 چرخه) */
export function wakeTimesFor(bedMin: number, latency = DEFAULT_LATENCY): { cycles: number; clock: string; sleepMin: number }[] {
  return [6, 5, 4].map((c) => ({ cycles: c, clock: minutesToClock(bedMin + latency + c * CYCLE_MIN), sleepMin: c * CYCLE_MIN }));
}

/** برای بیدارشدن در wakeMin، ساعت‌های خوب دراز کشیدن */
export function bedTimesFor(wakeMin: number, latency = DEFAULT_LATENCY): { cycles: number; clock: string; sleepMin: number }[] {
  return [6, 5, 4].map((c) => ({ cycles: c, clock: minutesToClock(wakeMin - latency - c * CYCLE_MIN), sleepMin: c * CYCLE_MIN }));
}

// ── وضعیت لحظه‌ای (هیروی صفحه) ─────────────────────────────────────────
export type SleepPhase = "morning" | "day" | "winddown" | "bedtime" | "night";

/**
 * بر اساس ساعت الان و ساعت‌های هدف: صبح (تا 4 ساعت بعد از بیداری هدف) → ثبت دیشب؛
 * روز؛ آماده‌شدن (90 دقیقه قبل از خواب هدف)؛ وقت خواب (تا 60 دقیقه بعد)؛ شب.
 */
export function sleepPhase(nowMin: number, target: { wake: string; sleep: string }): SleepPhase {
  const w = hm(target.wake), b = hm(target.sleep);
  if (!w || !b) return "day";
  const wake = w[0] * 60 + w[1], bed = b[0] * 60 + b[1];
  const since = (a: number) => ((nowMin - a) % 1440 + 1440) % 1440; // دقیقه از a تا الان
  if (since(wake) < 240) return "morning";
  const toBed = ((bed - nowMin) % 1440 + 1440) % 1440;
  if (toBed <= 90 && toBed > 0) return "winddown";
  if (since(bed) <= 60) return "bedtime";
  if (since(bed) < since(wake)) return "night";
  return "day";
}

/** دقیقه تا ساعت هدف بعدی (0..1439) */
export function minutesUntil(nowMin: number, hhmm: string): number | null {
  const t = hm(hhmm);
  if (!t) return null;
  return (((t[0] * 60 + t[1]) - nowMin) % 1440 + 1440) % 1440;
}

/** فاز ماه 0..1 (0 = ماه نو، 0.5 = ماه کامل) — برای تزئین هیروی شب */
export function moonPhase(date: Date): number {
  const ref = Date.UTC(2000, 0, 6, 18, 14); // یک ماه نو مرجع
  const syn = 29.530588853 * 86400000;
  const p = ((date.getTime() - ref) / syn) % 1;
  return p < 0 ? p + 1 : p;
}
