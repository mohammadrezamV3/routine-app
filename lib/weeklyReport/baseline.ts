import { Domain, DomainMetric, DOMAINS } from "./metrics";
import { Trend } from "./patterns";
import { TrailingWeek } from "./trailing";

// ============================================================================
// V3 — Personal Baseline: میانگینِ شخصیِ کاربر روی هر دامنه (نه یک مقیاسِ
// عمومی)، + یک پیش‌بینیِ نرم برایِ هفته‌ی جاری. فرمولِ Score اصلاً عوض
// نمی‌شه (algorithmVersion=1 می‌مونه) — این فقط یک لایه‌ی نمایشیِ اضافه‌ست.
// ============================================================================

export type Baseline = { domain: Domain; average: number; weeksConsidered: number };

/** میانگینِ N هفته‌ی اخیر (trailingWeeks) — نگاه کن به lib/weeklyReport/trailing.ts. */
export function computeBaselines(trailingWeeks: TrailingWeek[]): Baseline[] {
  const baselines: Baseline[] = [];
  for (const d of DOMAINS) {
    const scores = trailingWeeks.map((w) => w.metrics[d].score).filter((v): v is number => v != null);
    if (scores.length < 3) continue; // زیرِ ۳ هفته، baseline قابلِ‌اتکا نیست
    baselines.push({ domain: d, average: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length), weeksConsidered: scores.length });
  }
  return baselines;
}

export type Prediction = { domain: Domain; message: string; confidence: "low" | "medium"; evidence: string } | null;

/**
 * فقط برایِ هفته‌ی جاری معنا داره. شرط: میانگینِ روزهای‌تاکنونِ این هفته
 * به‌طورِ محسوس (≥۱۵ امتیاز) زیرِ baseline باشه، و Trendِ همون دامنه هم
 * نزولی باشه — یعنی هم «الان بد»، هم «روندِ اخیر هم بد». هیچ‌وقت قطعی.
 */
export function computePrediction(
  currentMetrics: Record<Domain, DomainMetric>, baselines: Baseline[], trends: Trend[]
): Prediction {
  for (const baseline of baselines) {
    const metric = currentMetrics[baseline.domain];
    if (!metric.active || metric.score == null || metric.daysWithData < 2) continue;
    const trend = trends.find((t) => t.domain === baseline.domain);
    if (!trend || trend.direction !== "down") continue;
    const gap = baseline.average - metric.score;
    if (gap < 15) continue;
    return {
      domain: baseline.domain,
      message: `بر اساسِ روندِ اخیر و میانگینِ شخصی‌ات (${baseline.average}٪)، این هفته فعلاً ${metric.score}٪ه — احتمالِ یک هفته‌ی ضعیف‌تر از حدِ معمولت وجود داره.`,
      confidence: metric.daysWithData >= 4 ? "medium" : "low",
      evidence: `میانگینِ ${baseline.weeksConsidered} هفته‌ی اخیر: ${baseline.average}٪ — این هفته تا الان: ${metric.score}٪`,
    };
  }
  return null;
}
