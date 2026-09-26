import type { Achievement, AnalysisDomain, DayCell, Grade } from "./types";
import { longestStreak } from "./score";

// دستاوردهای هفته — تابعِ خالص. دستاوردهای مخصوصِ هر دامنه فقط وقتی
// نشون داده می‌شن که اون دامنه برای کاربر فعال باشه؛ بقیه عمومی‌ان.

export type AchievementDomainInput = {
  domain: AnalysisDomain;
  hasData: boolean;
  daily: (number | null)[];
  meta: Record<string, number>;
};

export type AchievementInput = {
  domains: AchievementDomainInput[];
  days: DayCell[];
  score: number | null;
  prevScore: number | null;
  grade: Grade | null;
  activeDays: number;
};

const prog = (current: number, target: number) => ({ current: Math.min(Math.round(current), target), target });

export function buildAchievements(input: AchievementInput): Achievement[] {
  const out: Achievement[] = [];
  const dom = new Map(input.domains.map((d) => [d.domain, d]));

  // ── عمومی ──
  out.push({
    key: "all_days_active",
    title: "هفت روز فعال",
    description: "هر ۷ روز هفته حداقل یک چیز ثبت کن.",
    emoji: "📅",
    unlocked: input.activeDays >= 7,
    progress: prog(input.activeDays, 7),
  });
  const streak = longestStreak(input.days.map((d) => (d.isFuture ? null : d.score)), 70);
  out.push({
    key: "streak_5",
    title: "استریک ۵ روزه",
    description: "۵ روز پشت‌سرهم امتیاز ۷۰ یا بیشتر.",
    emoji: "🔥",
    unlocked: streak >= 5,
    progress: prog(streak, 5),
  });
  out.push({
    key: "beat_last_week",
    title: "بهتر از هفته‌ی قبل",
    description: "امتیاز کل این هفته بیشتر از هفته‌ی قبل باشه.",
    emoji: "📈",
    unlocked: input.score != null && input.prevScore != null && input.score > input.prevScore,
  });
  out.push({
    key: "grade_a",
    title: "نمره‌ی A",
    description: "هفته رو با نمره‌ی A یا S تموم کن (امتیاز ۸۰+).",
    emoji: "🏅",
    unlocked: input.grade === "A" || input.grade === "S",
    progress: prog(input.score ?? 0, 80),
  });

  // ── مخصوصِ دامنه‌ها ──
  const routine = dom.get("routine");
  if (routine) {
    const max = routine.meta.maxDay ?? 0;
    out.push({
      key: "perfect_day",
      title: "روز بی‌نقص",
      description: "یک روز همه‌ی آیتم‌های روتین رو تیک بزن.",
      emoji: "✨",
      unlocked: (routine.meta.perfectDays ?? 0) > 0,
      progress: prog(max, 100),
    });
  }
  const sleep = dom.get("sleep");
  if (sleep) {
    const n = sleep.meta.days7h ?? 0;
    out.push({ key: "sleep_7h_5days", title: "خواب کافی", description: "۵ شب حداقل ۷ ساعت بخواب.", emoji: "😴", unlocked: n >= 5, progress: prog(n, 5) });
  }
  const tasks = dom.get("tasks");
  if (tasks) {
    const due = tasks.meta.dueCount ?? 0;
    out.push({
      key: "no_overdue",
      title: "بدون عقب‌افتادگی",
      description: "هفته رو بدون هیچ کار عقب‌افتاده‌ای تموم کن.",
      emoji: "✅",
      unlocked: due > 0 && (tasks.meta.overdue ?? 0) === 0,
    });
  }
  const fitness = dom.get("fitness");
  if (fitness) {
    const planned = fitness.meta.planned ?? 0;
    const done = fitness.meta.done ?? 0;
    out.push({
      key: "fitness_all_sessions",
      title: "همه‌ی جلسات تمرین",
      description: "همه‌ی جلسه‌های برنامه‌ی این هفته رو انجام بده.",
      emoji: "💪",
      unlocked: planned > 0 && done >= planned,
      progress: planned > 0 ? prog(done, planned) : undefined,
    });
  }
  const nutrition = dom.get("nutrition");
  if (nutrition) {
    const n = nutrition.meta.onTargetDays ?? 0;
    out.push({ key: "nutrition_on_target_5", title: "تغذیه‌ی دقیق", description: "۵ روز کالری‌ت رو نزدیک هدف (±۱۰٪) نگه دار.", emoji: "🥗", unlocked: n >= 5, progress: prog(n, 5) });
  }
  const trading = dom.get("trading");
  if (trading) {
    const trades = trading.meta.trades ?? 0;
    const full = trading.meta.fullChecklist ?? 0;
    out.push({
      key: "trading_checklist_week",
      title: "هفته‌ی منضبط",
      description: "همه‌ی معاملات هفته با چک‌لیست کامل ثبت بشن.",
      emoji: "🎯",
      unlocked: trades > 0 && full >= trades,
      progress: trades > 0 ? prog(full, trades) : undefined,
    });
  }
  const learning = dom.get("learning");
  if (learning) {
    const n = learning.meta.activeDays ?? 0;
    out.push({ key: "learning_active", title: "یادگیری فعال", description: "این هفته روی رودمپت پیشرفت ثبت کن.", emoji: "📚", unlocked: n >= 1, progress: prog(n, 1) });
  }

  return out;
}
