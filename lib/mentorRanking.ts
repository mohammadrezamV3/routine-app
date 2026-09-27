// رتبه‌بندیِ «منتورهای محبوب» — عمداً نه صرفاً تعدادِ شاگرد. تعدادِ خام به
// منتورهای قدیمی/پرشاگرد اولویتِ همیشگی می‌داد و یک منتورِ تازه و عالی هیچ‌وقت
// دیده نمی‌شد. امتیاز از چند سیگنالِ *واقعاً اندازه‌گیری‌شده* ساخته می‌شه:
//
//   ۱) میانگینِ بیزیِ امتیاز — منتوری با یک نظرِ ۵ ستاره نباید از منتوری با
//      ۴۰ نظرِ ۴.۸ جلو بزنه؛ پس امتیاز به سمتِ یک پیش‌فرض (PRIOR_MEAN) با وزنِ
//      PRIOR_WEIGHT نظر کشیده می‌شه تا نظرهای واقعی کافی جمع بشه.
//   ۲) لگاریتمِ شاگردهای فعال — بیشتر بهتره ولی با بازدهِ نزولی، تا اندازه
//      به‌تنهایی برنده نباشه.
//   ۳) لگاریتمِ برنامه‌های تکمیل‌شده — نشونه‌ی نتیجه‌ی واقعی، نه فقط جذب.
//   ۴) ماندگاری = فعال ÷ کلِ رابطه‌های شروع‌شده — شاگردها موندن یا رفتن؟
//      با پیش‌فرضِ خنثی برای نمونه‌ی کوچک (همون منطقِ بیزی).
//   ۵) تازگیِ فعالیت — منتوری که هفته‌هاست سر نزده نباید بالای لیست باشه.
//
// زمانِ پاسخ‌گویی هنوز اندازه‌گیری نمی‌شه، پس عمداً در امتیاز نیست (جعلش
// نمی‌کنیم). اضافه‌کردنش = یک سیگنال و یک وزنِ جدید همین‌جا.

export type RankingSignals = {
  ratingAvg: number;
  ratingCount: number;
  activeStudents: number;
  totalStudents: number; // رابطه‌هایی که حداقل یک بار فعال شدن
  completedPrograms: number;
  lastActiveAt: Date | null;
};

const PRIOR_MEAN = 3.5;
const PRIOR_WEIGHT = 5;
const RETENTION_PRIOR = 0.5;
const RETENTION_PRIOR_WEIGHT = 3;
const RECENCY_HALF_LIFE_DAYS = 14;

export const RANKING_WEIGHTS = {
  rating: 0.4,
  students: 0.2,
  completed: 0.15,
  retention: 0.15,
  recency: 0.1,
} as const;

/** میانگینِ بیزیِ امتیاز در بازه‌ی ۰..۱ */
export function bayesianRating(avg: number, count: number): number {
  const n = Math.max(0, count);
  const mean = (PRIOR_MEAN * PRIOR_WEIGHT + (n > 0 ? avg : 0) * n) / (PRIOR_WEIGHT + n);
  return Math.min(1, Math.max(0, (mean - 1) / 4));
}

/** log-scale نرمال‌شده — ۱۰۰ واحد تقریباً سقف (۱)؛ بیشتر از اون تفاوتی نمی‌سازه */
function logScale(v: number, cap = 100): number {
  return Math.min(1, Math.log1p(Math.max(0, v)) / Math.log1p(cap));
}

export function retentionRatio(active: number, total: number): number {
  return (active + RETENTION_PRIOR * RETENTION_PRIOR_WEIGHT) / (Math.max(total, active) + RETENTION_PRIOR_WEIGHT);
}

/** نیمه‌عمرِ ۱۴روزه: امروز ۱، دو هفته پیش ۰.۵، هرگز ۰ */
export function recencyFactor(lastActiveAt: Date | null, now: Date = new Date()): number {
  if (!lastActiveAt) return 0;
  const days = Math.max(0, (now.getTime() - lastActiveAt.getTime()) / 86_400_000);
  return Math.pow(0.5, days / RECENCY_HALF_LIFE_DAYS);
}

export function popularScore(s: RankingSignals, now: Date = new Date()): number {
  return (
    RANKING_WEIGHTS.rating * bayesianRating(s.ratingAvg, s.ratingCount) +
    RANKING_WEIGHTS.students * logScale(s.activeStudents) +
    RANKING_WEIGHTS.completed * logScale(s.completedPrograms) +
    RANKING_WEIGHTS.retention * retentionRatio(s.activeStudents, s.totalStudents) +
    RANKING_WEIGHTS.recency * recencyFactor(s.lastActiveAt, now)
  );
}

/** مرتب‌سازیِ نزولی بر اساسِ امتیاز؛ تساوی با تعدادِ نظر و بعد تازگی شکسته می‌شه */
export function rankByPopularity<T>(items: T[], signals: (t: T) => RankingSignals, now: Date = new Date()): T[] {
  const scored = items.map((t) => {
    const s = signals(t);
    return { t, s, score: popularScore(s, now) };
  });
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.s.ratingCount - a.s.ratingCount ||
      (b.s.lastActiveAt?.getTime() ?? 0) - (a.s.lastActiveAt?.getTime() ?? 0)
  );
  return scored.map((x) => x.t);
}
