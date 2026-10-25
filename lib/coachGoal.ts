// منطق خالص هدف همکاری مربی و شاگرد (بخش مربی نسخه‌ی 3). پیشرفت هیچ‌وقت
// ذخیره یا دستی ثبت نمی‌شود؛ از مقدار واقعی هر هفته (گزارش هفته) حساب می‌شود.
// خواندن/نوشتن دیتابیس در lib/coachGoalServer.ts است.

import type { CoachGoalMetric, CoachGoalStatus, CoachGoalWeek } from "./coachTypes";
import { addDaysIso, isRealIso, weekEndOf, weekStartOf } from "./coachWeek";
import { checkNumber } from "./numberLimits";
import { tr } from "./i18n";

export const GOAL_METRICS: CoachGoalMetric[] = ["WORKOUT_SESSIONS", "ROUTINE_RATE"];
export const GOAL_MAX_WEEKS = 52;
export const GOAL_TITLE_MAX = 80;
/** شروع هدف حداکثر این‌قدر در گذشته یا آینده */
const START_PAST_DAYS = 28;
const START_FUTURE_DAYS = 14;

const WEEKS_LIMIT = { min: 1, max: GOAL_MAX_WEEKS, decimals: 0, fa: "تعداد هفته", en: "Number of weeks" } as const;
const RATE_LIMIT = { min: 1, max: 100, decimals: 0, fa: "درصد هدف", en: "Target percent" } as const;
const SESSIONS_LIMIT = { min: 1, max: 14, decimals: 0, fa: "تعداد جلسه در هفته", en: "Sessions per week" } as const;

export function isGoalMetric(v: unknown): v is CoachGoalMetric {
  return v === "WORKOUT_SESSIONS" || v === "ROUTINE_RATE";
}

/** روز آخر هدف (جمعه‌ی هفته‌ی آخر) */
export function goalEndDate(startDate: string, weeks: number): string {
  return addDaysIso(startDate, weeks * 7 - 1);
}

export function goalWeekStarts(startDate: string, weeks: number): string[] {
  return Array.from({ length: Math.max(0, weeks) }, (_, i) => addDaysIso(startDate, i * 7));
}

/** مقدار این هفته برای معیار هدف؛ null = پنهان یا بدون داده */
export function weekValueFor(metric: CoachGoalMetric, rep: { routineRate: number | null; workoutsDone: number | null }): number | null {
  return metric === "ROUTINE_RATE" ? rep.routineRate : rep.workoutsDone;
}

export type GoalCore = {
  metric: CoachGoalMetric;
  target: number;
  weeks: number;
  startDate: string;
  endDate: string;
  status: CoachGoalStatus;
};

export type GoalEvaluation = {
  history: CoachGoalWeek[];
  weeksMet: number;
  weeksPassed: number;
  weeksLeft: number;
  totalDone: number;
  status: CoachGoalStatus;
  /** هدف ACTIVE ذخیره‌شده که زمانش تموم شده و باید DONE ثبت بشه */
  justCompleted: boolean;
};

/** وضعیت مؤثر: ENDED/DONE ثابتن؛ ACTIVE بعد از روز آخر DONE می‌شه */
export function effectiveStatus(status: CoachGoalStatus, endDate: string, todayIso: string): CoachGoalStatus {
  if (status === "ENDED" || status === "DONE") return status;
  return todayIso > endDate ? "DONE" : "ACTIVE";
}

/**
 * values: مقدار هر هفته با کلید شنبه‌ی هفته. هفته‌ی آینده همیشه null.
 * weeksMet: هفته‌های رسیده به هدف (هفته‌ی جاری هم اگه الان رسیده)؛
 * weeksPassed: هفته‌های کاملا تموم‌شده.
 */
export function evaluateGoal(g: GoalCore, values: Record<string, number | null | undefined>, todayIso: string): GoalEvaluation {
  const starts = goalWeekStarts(g.startDate, g.weeks);
  const history: CoachGoalWeek[] = [];
  let weeksMet = 0;
  let weeksPassed = 0;
  let totalDone = 0;
  for (const ws of starts) {
    const we = weekEndOf(ws);
    const started = ws <= todayIso;
    const finished = we < todayIso;
    const current = started && !finished;
    const raw = started ? values[ws] : null;
    const value = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    const met = value !== null && value >= g.target;
    if (finished) weeksPassed++;
    if (met) weeksMet++;
    if (value !== null) totalDone += value;
    history.push({ weekStart: ws, value, met, current });
  }
  const status = effectiveStatus(g.status, g.endDate, todayIso);
  return {
    history,
    weeksMet,
    weeksPassed,
    weeksLeft: Math.max(0, g.weeks - weeksPassed),
    totalDone,
    status,
    justCompleted: g.status === "ACTIVE" && status === "DONE",
  };
}

export type GoalInputOk = { title: string; metric: CoachGoalMetric; target: number; weeks: number; startDate: string; endDate: string };

/** اعتبارسنجی بدنه‌ی POST هدف؛ startDate به شنبه‌ی همون هفته گرد می‌شه */
export function validateGoalInput(raw: unknown, todayIso: string): { ok: true; value: GoalInputOk } | { ok: false; error: string } {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.replace(/\s+/g, " ").trim() : "";
  if (!title) return { ok: false, error: tr("برای هدف یک عنوان کوتاه بنویس", "Write a short title for the goal") };
  if (title.length > GOAL_TITLE_MAX) return { ok: false, error: tr(`عنوان هدف حداکثر ${GOAL_TITLE_MAX} حرف باشه`, `The goal title can be at most ${GOAL_TITLE_MAX} characters`) };
  if (!isGoalMetric(b.metric)) return { ok: false, error: tr("نوع هدف نامعتبره", "Invalid goal type") };
  const target = checkNumber(b.target, b.metric === "ROUTINE_RATE" ? RATE_LIMIT : SESSIONS_LIMIT);
  if (!target.ok) return { ok: false, error: target.error };
  const weeks = checkNumber(b.weeks, WEEKS_LIMIT);
  if (!weeks.ok) return { ok: false, error: weeks.error };

  let start = weekStartOf(todayIso);
  if (b.startDate !== undefined && b.startDate !== null && b.startDate !== "") {
    if (!isRealIso(b.startDate)) return { ok: false, error: tr("تاریخ شروع نامعتبره", "Invalid start date") };
    start = weekStartOf(b.startDate);
    if (start < addDaysIso(todayIso, -START_PAST_DAYS) || start > addDaysIso(todayIso, START_FUTURE_DAYS)) {
      return { ok: false, error: tr("تاریخ شروع باید نزدیک امروز باشه", "The start date must be close to today") };
    }
  }
  return {
    ok: true,
    value: { title, metric: b.metric, target: target.value, weeks: weeks.value, startDate: start, endDate: goalEndDate(start, weeks.value) },
  };
}
