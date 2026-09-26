import type { AnalysisDomain, Grade } from "./types";

// امتیازدهیِ کلی — همه‌اش تابعِ خالص، بدون دیتابیس، تا تست‌پذیر بمونه.

// وزنِ هر دامنه در امتیازِ کل. روتین کمی سنگین‌تره چون ستونِ اصلیِ اپه؛
// یادگیری سبک‌تره چون امتیازش «پیشرفتِ تجمعیِ رودمپ»ه، نه کارِ همین هفته.
export const DOMAIN_WEIGHTS: Record<AnalysisDomain, number> = {
  routine: 1.2,
  sleep: 1,
  tasks: 1,
  fitness: 1,
  nutrition: 0.8,
  trading: 1,
  learning: 0.6,
};

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function stdDev(xs: number[]): number | null {
  const m = mean(xs);
  if (m == null) return null;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
}

/** میانگینِ وزن‌دارِ دامنه‌هایی که عدد دارن — «داده نداریم» صفر حساب نمی‌شه. */
export function weightedDomainScore(scores: Partial<Record<AnalysisDomain, number | null>>): number | null {
  let sum = 0;
  let w = 0;
  for (const [d, s] of Object.entries(scores) as [AnalysisDomain, number | null][]) {
    if (s == null || !Number.isFinite(s)) continue;
    const wt = DOMAIN_WEIGHTS[d] ?? 1;
    sum += s * wt;
    w += wt;
  }
  return w > 0 ? Math.round(sum / w) : null;
}

/** امتیازِ کل = میانگینِ وزن‌دارِ دامنه‌های دارای داده. */
export function overallScore(domains: { domain: AnalysisDomain; score: number | null }[]): number | null {
  return weightedDomainScore(Object.fromEntries(domains.map((d) => [d.domain, d.score])));
}

/**
 * امتیازِ هر روز (۷تایی) از روی daily همه‌ی دامنه‌ها — با همون وزن‌ها، تا
 * امتیازِ روزها و امتیازِ کل با یک منطق ساخته بشن.
 */
export function dayScores(domains: { domain: AnalysisDomain; daily: (number | null)[] }[]): (number | null)[] {
  return Array.from({ length: 7 }, (_, i) =>
    weightedDomainScore(Object.fromEntries(domains.map((d) => [d.domain, d.daily[i] ?? null])))
  );
}

export function gradeFor(score: number | null): Grade | null {
  if (score == null) return null;
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

/**
 * اطمینان از روی روزهای فعال. هفته‌ی جاری که تازه شروع شده نباید همیشه
 * «کم» باشه، پس اگه همه‌ی روزهای گذشته فعال بودن یک پله بالاتر حساب می‌شه.
 */
export function confidenceFor(activeDays: number, daysElapsed = 7): "low" | "medium" | "high" {
  if (activeDays >= 5) return "high";
  if (activeDays >= 3) return daysElapsed <= activeDays ? "high" : "medium";
  if (activeDays >= 2 && activeDays >= daysElapsed) return "medium";
  return "low";
}

/**
 * یکنواختی: 100 منهای انحراف معیارِ نرمال‌شده. بیشترین انحراف معیارِ ممکن
 * برای اعداد 0..100 عدد 50‌ه، پس std=50 → 0 و std=0 → 100. با کمتر از ۲
 * روزِ دارای امتیاز، معنایی نداره (null).
 */
export function consistencyFor(scores: (number | null)[]): number | null {
  const xs = scores.filter((s): s is number => s != null);
  if (xs.length < 2) return null;
  const sd = stdDev(xs)!;
  return Math.round(clamp(100 - (sd / 50) * 100));
}

/** طولانی‌ترین رشته‌ی روزهای پشتِ‌سرِهم با امتیاز ≥ threshold (null رشته رو می‌شکنه). */
export function longestStreak(scores: (number | null)[], threshold = 70): number {
  let best = 0;
  let cur = 0;
  for (const s of scores) {
    if (s != null && s >= threshold) {
      cur++;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best;
}
