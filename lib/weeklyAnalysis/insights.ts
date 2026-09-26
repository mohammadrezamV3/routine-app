import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type DayCell, type Insight } from "./types";
import { consistencyFor, longestStreak, mean } from "./score";

// بینش‌ها — همه تابعِ خالص روی خروجیِ محاسبه‌شده. هر بینش یک priority
// داخلی داره؛ آخر کار مرتب و به ۶ تا بریده می‌شه. متن‌ها فارسی، عددها لاتین.
//
// قانونِ صداقت: هیچ همبستگی‌ای بدون نمونه‌ی کافی گفته نمی‌شه — حداقل ۲ روز
// در هر گروه و اختلافِ حداقل ۱۰ امتیاز. دو روز هنوز «الگو» نیست، ولی
// برای یک مشاهده‌ی هفتگی با قیدِ «روزهایی که…» منصفانه‌ست.

export const CORR_MIN_GROUP = 2;
export const CORR_MIN_DIFF = 10;
const GOOD_THRESHOLD = 70;
const MAX_INSIGHTS = 6;

export type InsightDomainInput = {
  domain: AnalysisDomain;
  score: number | null;
  prevScore: number | null;
  delta: number | null;
  daily: (number | null)[];
};

export type InsightInput = {
  domains: InsightDomainInput[];
  days: DayCell[];
  overallScore: number | null;
  prevOverallScore: number | null;
  /** امتیازِ کلِ هفته‌های قبل (قدیمی → جدید)، بدون همین هفته */
  history: (number | null)[];
};

// «روزهایی که …» — عبارتِ حالتِ خوبِ هر دامنه
const GOOD_PHRASE: Record<AnalysisDomain, string> = {
  routine: "روتینت رو کامل‌تر انجام دادی",
  sleep: "خواب خوبی داشتی",
  tasks: "کارهات رو به‌موقع انجام دادی",
  fitness: "تمرین کردی",
  nutrition: "تغذیه‌ت طبق هدف بود",
  trading: "با انضباط ترید کردی",
  learning: "روی یادگیری کار کردی",
};

type Ranked = Insight & { priority: number };

export type Correlation = { driver: AnalysisDomain; outcome: AnalysisDomain; diff: number; goodN: number; badN: number };

/**
 * همبستگیِ روزانه بین دو دامنه: روزهای «خوبِ» driver (≥70) در برابر بقیه،
 * میانگینِ outcome در هر گروه. null اگه نمونه یا اختلاف کافی نبود.
 */
export function correlate(
  driver: (number | null)[],
  outcome: (number | null)[],
  minGroup = CORR_MIN_GROUP,
  minDiff = CORR_MIN_DIFF
): { diff: number; goodN: number; badN: number } | null {
  const good: number[] = [];
  const bad: number[] = [];
  for (let i = 0; i < Math.min(driver.length, outcome.length); i++) {
    const d = driver[i];
    const o = outcome[i];
    if (d == null || o == null) continue;
    (d >= GOOD_THRESHOLD ? good : bad).push(o);
  }
  if (good.length < minGroup || bad.length < minGroup) return null;
  const diff = Math.round(mean(good)! - mean(bad)!);
  if (Math.abs(diff) < minDiff) return null;
  return { diff, goodN: good.length, badN: bad.length };
}

export function findCorrelations(domains: InsightDomainInput[]): Correlation[] {
  const found = new Map<string, Correlation>();
  for (const a of domains) {
    for (const b of domains) {
      if (a.domain === b.domain) continue;
      const c = correlate(a.daily, b.daily);
      if (!c) continue;
      // جفتِ (a,b) و (b,a) تقریبا یک حرف رو می‌زنن — فقط قوی‌ترش می‌مونه
      const key = [a.domain, b.domain].sort().join("|");
      const prev = found.get(key);
      if (!prev || Math.abs(c.diff) > Math.abs(prev.diff)) found.set(key, { driver: a.domain, outcome: b.domain, ...c });
    }
  }
  return [...found.values()].sort(
    (x, y) => Math.abs(y.diff) * Math.min(y.goodN, y.badN) - Math.abs(x.diff) * Math.min(x.goodN, x.badN)
  );
}

const L = (d: AnalysisDomain) => ANALYSIS_DOMAIN_LABELS[d];

export function buildInsights(input: InsightInput): Insight[] {
  const out: Ranked[] = [];
  const { domains, days } = input;

  // ── همبستگی‌ها (حداکثر ۲) ──
  for (const c of findCorrelations(domains).slice(0, 2)) {
    const better = c.diff > 0;
    out.push({
      id: `corr_${c.driver}_${c.outcome}`,
      kind: "correlation",
      icon: "link",
      title: `${L(c.driver)} ↔ ${L(c.outcome)}`,
      body: `روزهایی که ${GOOD_PHRASE[c.driver]}، امتیاز ${L(c.outcome)} ${Math.abs(c.diff)} واحد ${better ? "بهتر" : "پایین‌تر"} بود.`,
      domain: c.outcome,
      tone: better ? "good" : "neutral",
      priority: 90 + Math.min(9, Math.abs(c.diff) / 5),
    });
  }

  // ── تغییر نسبت به هفته‌ی قبل ──
  const { overallScore: score, prevOverallScore: prev } = input;
  if (score != null && prev != null) {
    const d = score - prev;
    if (d >= 5) {
      out.push({ id: "overall_up", kind: "improvement", icon: "trend_up", title: "بهتر از هفته‌ی قبل", body: `امتیاز کلت از ${prev} به ${score} رسید (+${d}).`, tone: "good", priority: 80 + Math.min(9, d / 2) });
    } else if (d <= -5) {
      out.push({ id: "overall_down", kind: "decline", icon: "trend_down", title: "افت نسبت به هفته‌ی قبل", body: `امتیاز کلت از ${prev} به ${score} رسید (${d}).`, tone: "bad", priority: 82 + Math.min(9, -d / 2) });
    }
  }
  // بزرگ‌ترین تغییرِ یک دامنه
  const movers = domains
    .filter((x) => x.delta != null && Math.abs(x.delta) >= 10)
    .sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!));
  if (movers[0]) {
    const m = movers[0];
    const up = m.delta! > 0;
    out.push({
      id: `domain_${up ? "up" : "down"}_${m.domain}`,
      kind: up ? "improvement" : "decline",
      icon: up ? "trend_up" : "trend_down",
      title: up ? `پیشرفت در ${L(m.domain)}` : `افت در ${L(m.domain)}`,
      body: `امتیاز ${L(m.domain)} از ${m.prevScore} به ${m.score} ${up ? "رسید" : "افتاد"} (${up ? "+" : ""}${m.delta}).`,
      domain: m.domain,
      tone: up ? "good" : "bad",
      priority: up ? 75 : 78,
    });
  }

  // ── در برابر میانگینِ هفته‌های قبل (حداقل ۲ هفته سابقه) ──
  const hist = input.history.filter((h): h is number => h != null);
  if (score != null && hist.length >= 2) {
    const avg = Math.round(mean(hist)!);
    const d = score - avg;
    if (d >= 8) {
      out.push({ id: "above_avg", kind: "improvement", icon: "trophy", title: "بالاتر از میانگینت", body: `این هفته ${d} امتیاز بالاتر از میانگین ${hist.length} هفته‌ی اخیرت (${avg}) بودی.`, tone: "good", priority: 60 });
    } else if (d <= -8) {
      out.push({ id: "below_avg", kind: "decline", icon: "alert", title: "پایین‌تر از میانگینت", body: `این هفته ${-d} امتیاز پایین‌تر از میانگین ${hist.length} هفته‌ی اخیرت (${avg}) بودی.`, tone: "bad", priority: 62 });
    }
  }

  // ── استریک ──
  const dayScores = days.map((d) => (d.isFuture ? null : d.score));
  const streak = longestStreak(dayScores, 70);
  if (streak >= 3) {
    out.push({ id: "streak", kind: "streak", icon: "flame", title: `${streak} روز پشت‌سرهم`, body: `${streak} روز متوالی امتیاز 70 یا بیشتر گرفتی.`, tone: "good", priority: 70 + streak });
  }

  // ── روزِ غیرعادی در یک دامنه (حداقل ۴ روز داده، فاصله ≥۳۵ از میانگین) ──
  let outlier: { d: InsightDomainInput; i: number; v: number; avg: number } | null = null;
  for (const d of domains) {
    const vals = d.daily.filter((v): v is number => v != null);
    if (vals.length < 4) continue;
    const avg = mean(vals)!;
    d.daily.forEach((v, i) => {
      if (v == null) return;
      if (Math.abs(v - avg) >= 35 && (!outlier || Math.abs(v - avg) > Math.abs(outlier.v - outlier.avg))) outlier = { d, i, v, avg };
    });
  }
  if (outlier) {
    const o = outlier as { d: InsightDomainInput; i: number; v: number; avg: number };
    const low = o.v < o.avg;
    const wd = days[o.i]?.weekday ?? "";
    out.push({
      id: `outlier_${o.d.domain}_${o.i}`,
      kind: "outlier",
      icon: "zap",
      title: `${wd} غیرعادی بود`,
      body: `${L(o.d.domain)} در ${wd} ${o.v} بود، در حالی که میانگین هفته‌ت ${Math.round(o.avg)} بود.`,
      domain: o.d.domain,
      tone: low ? "bad" : "good",
      priority: 65,
    });
  }

  // ── بهترین/بدترین روز (حداقل ۳ روزِ دارای امتیاز و فاصله‌ی ≥۱۵) ──
  const scored = days.filter((d) => !d.isFuture && d.score != null);
  if (scored.length >= 3) {
    const best = scored.reduce((a, b) => (b.score! > a.score! ? b : a));
    const worst = scored.reduce((a, b) => (b.score! < a.score! ? b : a));
    if (best.score! - worst.score! >= 15) {
      out.push({ id: "best_day", kind: "best_day", icon: "trophy", title: `بهترین روز: ${best.weekday}`, body: `${best.weekday} با امتیاز ${best.score} بهترین روز هفته‌ت بود.`, tone: "good", priority: 55 });
      out.push({ id: "worst_day", kind: "worst_day", icon: "calendar", title: `ضعیف‌ترین روز: ${worst.weekday}`, body: `${worst.weekday} با امتیاز ${worst.score} پایین‌ترین روز بود — ببین اون روز چی فرق داشت.`, tone: "bad", priority: 57 });
    }
  }

  // ── یکنواختی ──
  const cons = consistencyFor(dayScores);
  if (cons != null && scored.length >= 4) {
    if (cons >= 85) out.push({ id: "consistent", kind: "consistency", icon: "calendar", title: "هفته‌ی یکنواخت", body: `یکنواختی روزهات ${cons} از 100 بود — ریتمت ثابت مونده.`, tone: "good", priority: 50 });
    else if (cons <= 50) out.push({ id: "inconsistent", kind: "consistency", icon: "alert", title: "نوسان زیاد بین روزها", body: `یکنواختی روزهات ${cons} از 100 بود — بعضی روزها خیلی بهتر از بقیه بودن.`, tone: "bad", priority: 52 });
  }

  return out
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_INSIGHTS)
    .map(({ priority: _p, ...ins }) => ins);
}
