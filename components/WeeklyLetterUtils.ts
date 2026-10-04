// منطق خالص UI هفته‌نامه (بدون React، تست‌دار): آفست هفته، گروه‌بندی ماه
// جلالی، متن انسانی جزئیات هر روز، نرمال‌سازی داده‌ی ناقص. هیچ import سروری
// نداره تا کلاینت امن باشه.
import { J_MONTHS, toJalali } from "@/lib/jalali";
import { ANALYSIS_DOMAINS, type AnalysisDomain, type DayCell, type DayDetails, type LetterSummary } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";

const DAY_MS = 86_400_000;

export const WEEK_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

function utcMs(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * فاصله‌ی هفته‌ی هفته‌نامه تا هفته‌ی جاری (شنبه‌محور): 0 = هفته‌ی جاری، -1 = قبلی.
 * همون قرارداد `?offset=` صفحه‌ی آنالیز. «امروز» از تاریخ محلی مرورگره.
 */
export function offsetOfWeek(weekStart: string, now: Date = new Date()): number {
  if (!WEEK_PARAM_RE.test(weekStart)) return -1;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffToSat = (new Date(today).getUTCDay() + 1) % 7; // شنبه = 0
  const curStart = today - diffToSat * DAY_MS;
  return Math.min(0, Math.round((utcMs(weekStart) - curStart) / (7 * DAY_MS)));
}

export function jalaliParts(iso: string): { y: number; m: number; d: number } {
  const [gy, gm, gd] = iso.slice(0, 10).split("-").map(Number);
  const [y, m, d] = toJalali(gy, gm, gd);
  return { y, m, d };
}

/** «4 مهر» */
export function jalaliDayMonth(iso: string): string {
  const { m, d } = jalaliParts(iso);
  return `${d} ${J_MONTHS[m - 1]}`;
}

/** سال جلالی روز آخر هفته، مثلا 1405 */
export function letterYear(weekEnd: string): number {
  return jalaliParts(weekEnd).y;
}

export type MonthGroup<T> = { key: string; label: string; items: T[] };

/** گروه‌بندی شماره‌ها بر اساس ماه جلالی روز شروع هفته؛ ترتیب ورودی (تازه‌ترین اول) حفظ می‌شه. */
export function groupByJalaliMonth(letters: LetterSummary[]): MonthGroup<LetterSummary>[] {
  const groups: MonthGroup<LetterSummary>[] = [];
  for (const l of letters) {
    if (!WEEK_PARAM_RE.test(l.weekStart)) continue;
    const { y, m } = jalaliParts(l.weekStart);
    const key = `${y}-${String(m).padStart(2, "0")}`;
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label: `${J_MONTHS[m - 1]} ${y}`, items: [] }; groups.push(g); }
    g.items.push(l);
  }
  return groups;
}

export type ScoreBand = "great" | "good" | "mid" | "low";
export function scoreBand(score: number | null | undefined): ScoreBand | "none" {
  if (score === null || score === undefined || !Number.isFinite(score)) return "none";
  if (score >= 80) return "great";
  if (score >= 60) return "good";
  if (score >= 40) return "mid";
  return "low";
}

/** رنگ شدت امتیاز: همیشه همون یک رنگ داده (ring-1)؛ امتیاز کمتر = کم‌رنگ‌تر (نه رنگ دیگه). */
export const BAND_COLOR: Record<ScoreBand | "none", string> = {
  great: "var(--ring-1a)",
  good: "color-mix(in srgb, var(--ring-1a) 80%, var(--muted2))",
  mid: "color-mix(in srgb, var(--ring-1a) 56%, var(--muted2))",
  low: "color-mix(in srgb, var(--ring-1a) 36%, var(--muted2))",
  none: "var(--muted2)",
};

/** شدت بصری 0.4 تا 1 از روی امتیاز (برای شفافیت میله/هاله/حلقه)؛ بی‌امتیاز = 0.4 */
export function scoreIntensity(score: number | null | undefined): number {
  if (score === null || score === undefined || !Number.isFinite(score)) return 0.4;
  return Math.round((0.4 + 0.6 * Math.min(1, Math.max(0, score / 100))) * 100) / 100;
}

export type OdoCell = { kind: "digit"; digit: number } | { kind: "char"; ch: string };

/** رشته‌ی عدد → سلول‌های اودومتر: هر رقم جدا می‌چرخه، بقیه‌ی نویسه‌ها (/ . % + −) ثابت می‌مونن. */
export function odometerCells(value: string): OdoCell[] {
  return Array.from(value).map((ch) => (ch >= "0" && ch <= "9" ? { kind: "digit", digit: ch.charCodeAt(0) - 48 } : { kind: "char", ch }));
}

/** منحنی نرم از نقاط (Catmull-Rom به Bézier) — مشترک نمودار خواننده و اسلاید مسیر */
export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0].x} ${pts[0].y}` : "";
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x} ${p2.y}`;
  }
  return d;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** عدد با حداکثر یک رقم اعشار، بدون صفر اضافه: 7.2، 7 */
export function fmtNum(n: number, digits = 1): string {
  const f = Math.pow(10, digits);
  return String(Math.round(n * f) / f);
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", USC: "¢" };

export function fmtMoney(net: number, currency: string | null): string {
  const sign = net > 0 ? "+" : net < 0 ? "−" : "";
  const sym = currency ? (CURRENCY_SYMBOL[currency.toUpperCase()] ?? currency) : "";
  return `${sign}${fmtNum(Math.abs(net), 2)}${sym ? ` ${sym}` : ""}`;
}

export type DayRow = { domain: AnalysisDomain; text: string; sub?: string; tone?: "good" | "bad" | "neutral"; ratio?: number };

const FITNESS_TEXT: Record<NonNullable<DayDetails["fitness"]>["status"], { text: string; tone: "good" | "bad" | "neutral" }> = {
  done: { text: "تمرین طبق برنامه انجام شد", tone: "good" },
  extra: { text: "تمرین اضافه در روز غیرباشگاه", tone: "good" },
  rest: { text: "روز استراحت برنامه", tone: "neutral" },
  missed: { text: "تمرین امروز انجام نشد", tone: "bad" },
  partial: { text: "تمرین نیمه‌کاره موند", tone: "neutral" },
};

/** هر کلید DayDetails → یک ردیف متن فارسی؛ ترتیب ثابت دامنه‌ها. */
export function dayRows(details: DayDetails | undefined | null): DayRow[] {
  const d = details ?? {};
  const rows: DayRow[] = [];
  if (d.routine && d.routine.total > 0) {
    rows.push({
      domain: "routine",
      text: `${d.routine.done} از ${d.routine.total} برنامه انجام شد`,
      ratio: d.routine.done / d.routine.total,
      tone: d.routine.done >= d.routine.total ? "good" : "neutral",
    });
  }
  if (d.sleep) {
    const s = d.sleep;
    const parts: string[] = [];
    if (s.sleptAt && s.wokeAt) parts.push(`${s.sleptAt} تا ${s.wokeAt}`);
    if (s.quality !== null && s.quality !== undefined) parts.push(`کیفیت ${s.quality} از 5`);
    rows.push({
      domain: "sleep",
      text: s.hours !== null && s.hours !== undefined ? `${fmtNum(s.hours)} ساعت خواب` : "خواب ثبت شد",
      sub: parts.length ? parts.join(" · ") : undefined,
      tone: s.hours !== null && s.hours !== undefined ? (s.hours >= 7 ? "good" : s.hours < 6 ? "bad" : "neutral") : "neutral",
    });
  }
  if (d.fitness) {
    const f = FITNESS_TEXT[d.fitness.status] ?? FITNESS_TEXT.rest;
    rows.push({ domain: "fitness", text: f.text, tone: f.tone });
  }
  if (d.nutrition) {
    const n = d.nutrition;
    const parts: string[] = [];
    if (n.protein !== null && n.protein !== undefined) parts.push(`پروتئین ${fmtInt(n.protein)} گرم`);
    let tone: DayRow["tone"] = "neutral";
    let text = `${fmtInt(n.kcal)} کالری`;
    if (n.target) {
      text = `${fmtInt(n.kcal)} از ${fmtInt(n.target)} کالری`;
      const within = Math.abs(n.kcal - n.target) / n.target <= 0.1;
      tone = within ? "good" : "bad";
      parts.unshift(within ? "در محدوده‌ی هدف" : n.kcal > n.target ? "بالای هدف" : "زیر هدف");
    }
    rows.push({ domain: "nutrition", text, sub: parts.length ? parts.join(" · ") : undefined, tone });
  }
  if (d.trading && d.trading.count > 0) {
    const t = d.trading;
    rows.push({
      domain: "trading",
      text: `${t.count} معامله: ${t.wins} برد و ${t.losses} باخت`,
      // جداسازی LTR تا علامت +/− و نماد ارز در متن راست‌به‌چپ جابه‌جا نشن
      sub: t.net !== null && t.net !== undefined ? `نتیجه \u2066${fmtMoney(t.net, t.currency)}\u2069` : undefined,
      tone: t.net === null || t.net === undefined ? "neutral" : t.net > 0 ? "good" : t.net < 0 ? "bad" : "neutral",
    });
  }
  if (d.tasks && (d.tasks.due > 0 || d.tasks.done > 0)) {
    rows.push({
      domain: "tasks",
      text: `${d.tasks.done} از ${d.tasks.due} کار انجام شد`,
      ratio: d.tasks.due > 0 ? Math.min(1, d.tasks.done / d.tasks.due) : undefined,
      tone: d.tasks.due > 0 && d.tasks.done >= d.tasks.due ? "good" : "neutral",
    });
  }
  if (d.learning && d.learning.steps > 0) {
    rows.push({ domain: "learning", text: `${d.learning.steps} قدم یادگیری`, tone: "good" });
  }
  return rows;
}

/** اندیس بهترین/ضعیف‌ترین روز بین روزهای امتیازدار (حداقل دو روز تا مقایسه معنی داشته باشه). */
export function bestWorstIndex(days: DayCell[]): { best: number; worst: number } {
  let best = -1;
  let worst = -1;
  let n = 0;
  days.forEach((d, i) => {
    if (d.score === null || d.score === undefined) return;
    n++;
    if (best < 0 || d.score > (days[best].score as number)) best = i;
    if (worst < 0 || d.score < (days[worst].score as number)) worst = i;
  });
  if (n < 2 || best === worst) return { best: n ? best : -1, worst: -1 };
  return { best, worst };
}

/** «34/40» یا «7.4» یا «62%» → اجزای قابل شمارش؛ هر چیز دیگه (ساعت 23:40 و ...) null = ثابت. */
export function parseCountable(value: string): { prefix: string; num: number; decimals: number; suffix: string } | null {
  const m = /^([+−-]?)(\d+)(?:\.(\d+))?(.*)$/.exec(value.replace(/[\u2066-\u2069]/g, "").trim());
  if (!m) return null;
  const rest = m[4];
  // فقط پسوندهای ساده: درصد، /عدد؛ جلوی «23:40» یا «1,200» رو می‌گیره
  if (rest && !/^(%|\/\d+(\.\d+)?%?)$/.test(rest)) return null;
  const decimals = m[3] ? m[3].length : 0;
  const num = Number(`${m[2]}${m[3] ? "." + m[3] : ""}`);
  if (!Number.isFinite(num) || num > 1e7) return null;
  return { prefix: m[1], num, decimals, suffix: rest };
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** هر فیلد ناقص/قدیمی به مقدار امن تبدیل می‌شه تا UI هیچ‌وقت نترکه. */
export function normalizeLetter(raw: Partial<WeeklyLetterData> | null | undefined): WeeklyLetterData | null {
  if (!raw || typeof raw !== "object" || !raw.weekStart) return null;
  const r = raw as WeeklyLetterData;
  return {
    ...r,
    issueNo: r.issueNo ?? 0,
    weekEnd: r.weekEnd ?? r.weekStart,
    weekLabel: r.weekLabel ?? "",
    greetingName: r.greetingName ?? null,
    headline: r.headline ?? "",
    intro: r.intro ?? "",
    archetype: r.archetype ?? null,
    overall: {
      score: r.overall?.score ?? null,
      prevScore: r.overall?.prevScore ?? null,
      delta: r.overall?.delta ?? null,
      grade: r.overall?.grade ?? null,
      consistency: r.overall?.consistency ?? null,
      activeDays: r.overall?.activeDays ?? 0,
      rank: r.overall?.rank ?? null,
    },
    days: arr<DayCell>(r.days).map((d) => ({ ...d, details: d.details ?? {} })),
    domains: arr<WeeklyLetterData["domains"][number]>(r.domains).filter((d) => d && d.active !== false && ANALYSIS_DOMAINS.includes(d.domain)).map((d) => ({
      ...d, stats: arr(d.stats), daily: arr(d.daily), note: d.note ?? "", bestDay: d.bestDay ?? null, worstDay: d.worstDay ?? null,
    })),
    numbers: arr(r.numbers),
    trend: arr(r.trend),
    insights: arr(r.insights),
    wins: arr<string>(r.wins).filter(Boolean),
    improve: arr<string>(r.improve).filter(Boolean),
    achievements: arr(r.achievements),
    streak: r.streak && r.streak.days > 0 ? r.streak : null,
    goals: arr(r.goals),
    reflection: r.reflection && (r.reflection.wentWell || r.reflection.improve || r.reflection.mood) ? r.reflection : null,
    ai: r.ai && (r.ai.summary || arr(r.ai.recommendations).length) ? { ...r.ai, recommendations: arr(r.ai.recommendations) } : null,
    nextWeek: {
      focusDomain: r.nextWeek?.focusDomain ?? null,
      focusTitle: r.nextWeek?.focusTitle ?? "",
      focusText: r.nextWeek?.focusText ?? "",
      suggestedTarget: r.nextWeek?.suggestedTarget ?? null,
    },
  };
}
