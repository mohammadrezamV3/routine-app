import { Domain, DomainMetric, DOMAINS } from "./metrics";

// وزن پایه‌ی هر دامنه (بند ۹ اسپک) — Configurable در یک جا، نه پراکنده.
export const DOMAIN_WEIGHTS: Record<Domain, number> = {
  routine: 0.25,
  fitness: 0.2,
  trading: 0.2,
  learning: 0.15,
  nutrition: 0.2,
};

export type Confidence = "low" | "medium" | "high";

export function confidenceFromDaysWithData(daysWithData: number): Confidence {
  if (daysWithData >= 5) return "high";
  if (daysWithData >= 2) return "medium";
  return "low";
}

/**
 * امتیاز کلی هفته — فقط روی دامنه‌هایی حساب می‌شه که هم فعال‌ن هم
 * این‌هفته داده دارن (score != null)؛ وزن‌های بقیه‌ی دامنه‌ها Dynamic
 * Normalized روی همین زیرمجموعه توزیع می‌شه — نبود یک ماژول یا نبودن
 * داده‌ی این‌هفته نباید امتیاز رو مصنوعا پایین بیاره.
 */
export function computeOverallScore(domains: Record<Domain, DomainMetric>): { score: number | null; confidence: Confidence } {
  const scored = DOMAINS.filter((d) => domains[d].active && domains[d].score != null);
  if (scored.length === 0) return { score: null, confidence: "low" };

  const totalWeight = scored.reduce((sum, d) => sum + DOMAIN_WEIGHTS[d], 0);
  const weighted = scored.reduce((sum, d) => sum + (domains[d].score as number) * (DOMAIN_WEIGHTS[d] / totalWeight), 0);

  const totalDaysWithData = scored.reduce((sum, d) => sum + domains[d].daysWithData, 0);
  const avgDaysWithData = totalDaysWithData / scored.length;

  return { score: Math.round(weighted), confidence: confidenceFromDaysWithData(avgDaysWithData) };
}
