import type { Achievement, AnalysisDomain, DayCell, Grade } from "./types";
import { longestStreak } from "./score";
import { tr } from "@/lib/i18n";

// دستاوردهای هفته — تابع خالص. دستاوردهای مخصوص هر دامنه فقط وقتی
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
    title: tr("هفت روز فعال", "Seven active days"),
    description: tr("هر 7 روز هفته حداقل یک چیز ثبت کن.", "Log at least one thing on every day of the week."),
    emoji: "📅",
    unlocked: input.activeDays >= 7,
    progress: prog(input.activeDays, 7),
  });
  const streak = longestStreak(input.days.map((d) => (d.isFuture ? null : d.score)), 70);
  out.push({
    key: "streak_5",
    title: tr("استریک 5 روزه", "5-day streak"),
    description: tr("5 روز پشت‌سرهم امتیاز 70 یا بیشتر.", "Score 70 or more for 5 days in a row."),
    emoji: "🔥",
    unlocked: streak >= 5,
    progress: prog(streak, 5),
  });
  out.push({
    key: "beat_last_week",
    title: tr("بهتر از هفته‌ی قبل", "Better than last week"),
    description: tr("امتیاز کل این هفته بیشتر از هفته‌ی قبل باشه.", "Make this week's overall score higher than last week's."),
    emoji: "📈",
    unlocked: input.score != null && input.prevScore != null && input.score > input.prevScore,
  });
  out.push({
    key: "grade_a",
    title: tr("نمره‌ی A", "Grade A"),
    description: tr("هفته رو با نمره‌ی A یا S تموم کن (امتیاز 80+).", "Finish the week with an A or S grade (score 80+)."),
    emoji: "🏅",
    unlocked: input.grade === "A" || input.grade === "S",
    progress: prog(input.score ?? 0, 80),
  });

  // ── مخصوص دامنه‌ها ──
  const routine = dom.get("routine");
  if (routine) {
    const max = routine.meta.maxDay ?? 0;
    out.push({
      key: "perfect_day",
      title: tr("روز بی‌نقص", "Perfect day"),
      description: tr("یک روز همه‌ی آیتم‌های روتین رو تیک بزن.", "Tick every routine item in a single day."),
      emoji: "✨",
      unlocked: (routine.meta.perfectDays ?? 0) > 0,
      progress: prog(max, 100),
    });
  }
  const sleep = dom.get("sleep");
  if (sleep) {
    const n = sleep.meta.days7h ?? 0;
    out.push({ key: "sleep_7h_5days", title: tr("خواب کافی", "Enough sleep"), description: tr("5 شب حداقل 7 ساعت بخواب.", "Sleep at least 7 hours on 5 nights."), emoji: "😴", unlocked: n >= 5, progress: prog(n, 5) });
  }
  const tasks = dom.get("tasks");
  if (tasks) {
    const due = tasks.meta.dueCount ?? 0;
    out.push({
      key: "no_overdue",
      title: tr("بدون عقب‌افتادگی", "Nothing overdue"),
      description: tr("هفته رو بدون هیچ کار عقب‌افتاده‌ای تموم کن.", "Finish the week with no overdue tasks."),
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
      title: tr("همه‌ی جلسات تمرین", "Every workout session"),
      description: tr("همه‌ی جلسه‌های برنامه‌ی این هفته رو انجام بده.", "Complete every session in this week's plan."),
      emoji: "💪",
      unlocked: planned > 0 && done >= planned,
      progress: planned > 0 ? prog(done, planned) : undefined,
    });
  }
  const nutrition = dom.get("nutrition");
  if (nutrition) {
    const n = nutrition.meta.onTargetDays ?? 0;
    out.push({ key: "nutrition_on_target_5", title: tr("تغذیه‌ی دقیق", "Precise nutrition"), description: tr("5 روز کالری‌ت رو نزدیک هدف (±10٪) نگه دار.", "Keep your calories near target (within 10%) on 5 days."), emoji: "🥗", unlocked: n >= 5, progress: prog(n, 5) });
  }
  const trading = dom.get("trading");
  if (trading) {
    const trades = trading.meta.trades ?? 0;
    const full = trading.meta.fullChecklist ?? 0;
    out.push({
      key: "trading_checklist_week",
      title: tr("هفته‌ی منضبط", "A disciplined week"),
      description: tr("همه‌ی معاملات هفته با چک‌لیست کامل ثبت بشن.", "Log every trade of the week with a complete checklist."),
      emoji: "🎯",
      unlocked: trades > 0 && full >= trades,
      progress: trades > 0 ? prog(full, trades) : undefined,
    });
  }
  const learning = dom.get("learning");
  if (learning) {
    const n = learning.meta.activeDays ?? 0;
    out.push({ key: "learning_active", title: tr("یادگیری فعال", "Active learning"), description: tr("این هفته روی رودمپت پیشرفت ثبت کن.", "Log progress on your roadmap this week."), emoji: "📚", unlocked: n >= 1, progress: prog(n, 1) });
  }

  return out;
}
