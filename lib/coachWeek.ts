// منطق خالص گزارش هفته‌ی مربی (بخش مربی نسخه‌ی 3): مرز هفته (شنبه تا جمعه)،
// نمره و ساخت گزارش از ورودی خام روزها. هیچ import سروری ندارد تا تست‌دار و
// کلاینت‌امن بماند؛ خواندن داده با رعایت حریم خصوصی در lib/coachWeekServer.ts است.
//
// قانون پنهان: چیزی که شاگرد با این مربی به اشتراک نگذاشته null می‌شود،
// هیچ‌وقت 0 (صفر یعنی «انجام نداده»، null یعنی «نمی‌بینم»).

import type { CoachWeekDay, CoachWeekReport } from "./coachTypes";

const DAY_MS = 86_400_000;

/** گزارش بدون بخش‌هایی که فقط مربی می‌بیند و ذخیره نمی‌شوند (summary/seenAt) */
export type CoachWeekData = Omit<CoachWeekReport, "summary" | "seenAt">;

export const WEEK_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function utcMs(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isRealIso(s: unknown): s is string {
  if (typeof s !== "string" || !WEEK_ISO_RE.test(s)) return false;
  return new Date(utcMs(s)).toISOString().slice(0, 10) === s;
}

export function addDaysIso(iso: string, days: number): string {
  return new Date(utcMs(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** روز هفته به سبک JS (0=یکشنبه … 6=شنبه) */
export function jsDayOfIso(iso: string): number {
  return new Date(utcMs(iso)).getUTCDay();
}

/** شنبه‌ی هفته‌ای که این روز در آن است */
export function weekStartOf(iso: string): string {
  const since = (jsDayOfIso(iso) + 1) % 7; // شنبه=0 … جمعه=6
  return addDaysIso(iso, -since);
}

export function isWeekStart(iso: string): boolean {
  return isRealIso(iso) && jsDayOfIso(iso) === 6;
}

export function weekEndOf(weekStart: string): string {
  return addDaysIso(weekStart, 6);
}

/** هفت روز هفته (شنبه … جمعه) */
export function weekDatesOf(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));
}

/** آخرین هفته‌ی کامل‌شده نسبت به امروز */
export function lastFinishedWeekStart(todayIso: string): string {
  return addDaysIso(weekStartOf(todayIso), -7);
}

/** n هفته‌ی اخیر، جدیدترین اول: [هفته‌ی جاری، قبلی، …] */
export function recentWeekStarts(todayIso: string, n: number): string[] {
  const cur = weekStartOf(todayIso);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDaysIso(cur, -7 * i));
}

/** هفته‌ی چندم همکاری (از 1)؛ تاریخ شروع نامعلوم = 1 */
export function weekIndexOf(startedIso: string | null | undefined, weekStart: string): number {
  if (!startedIso || !isRealIso(startedIso)) return 1;
  const diff = Math.round((utcMs(weekStart) - utcMs(weekStartOf(startedIso))) / (7 * DAY_MS));
  return Math.max(1, diff + 1);
}

export type CoachGrade = CoachWeekReport["grade"];

/** نمره: great>=80 good>=50 low<50 none=بدون داده */
export function gradeOf(rate: number | null | undefined): CoachGrade {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return "none";
  if (rate >= 80) return "great";
  if (rate >= 50) return "good";
  return "low";
}

export type CoachDayInput = {
  date: string;
  /** سهم انجام‌شده (ناقص = نصف) و تعداد برنامه‌دار؛ null = پنهان یا بدون داده */
  routineDone: number | null;
  routineTotal: number | null;
  workout: boolean | null;
  sleepMinutes: number | null;
};

export type CoachWeekInput = {
  mentorshipId: string;
  weekStart: string;
  todayIso: string;
  startedIso: string | null;
  /** دقیقا 7 روز به ترتیب شنبه تا جمعه */
  days: CoachDayInput[];
  /** مربی اجازه‌ی دیدن تمرین شاگرد را دارد (جلسه‌های ثبت‌شده یا برنامه‌ی تمرینی خود مربی) */
  workoutAccess: boolean;
  workoutsPlanned: number | null;
  streak: number | null;
  prevRoutineRate: number | null;
};

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function dayRoutineRate(done: number | null, total: number | null): number | null {
  if (done === null || total === null || total <= 0) return null;
  return clampPct((done / total) * 100);
}

/** میانگین خواب روزهای دارای داده (دقیقه)؛ بدون داده = null */
export function avgSleep(mins: (number | null)[]): number | null {
  const v = mins.filter((m): m is number => typeof m === "number" && m > 0);
  if (v.length === 0) return null;
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

export function buildWeekReport(i: CoachWeekInput): CoachWeekData {
  const weekEnd = weekEndOf(i.weekStart);
  const dates = weekDatesOf(i.weekStart);
  const byDate = new Map(i.days.map((d) => [d.date, d]));

  const days: CoachWeekDay[] = dates.map((date) => {
    const d = byDate.get(date);
    return {
      date,
      routineRate: d ? dayRoutineRate(d.routineDone, d.routineTotal) : null,
      workout: i.workoutAccess ? d?.workout ?? null : null,
      sleepMinutes: d?.sleepMinutes ?? null,
    };
  });

  let done = 0;
  let total = 0;
  for (const d of i.days) {
    if (d.routineDone === null || d.routineTotal === null || d.routineTotal <= 0) continue;
    done += d.routineDone;
    total += d.routineTotal;
  }
  const routineRate = total > 0 ? clampPct((done / total) * 100) : null;
  const routineDelta = routineRate !== null && i.prevRoutineRate !== null ? routineRate - i.prevRoutineRate : null;

  const workoutsDone = i.workoutAccess ? days.filter((d) => d.workout === true).length : null;
  const workoutsPlanned = i.workoutAccess ? i.workoutsPlanned : null;

  // نمره از روتین؛ اگه روتین نیست از نسبت جلسه‌های تمرین به برنامه
  let basis: number | null = routineRate;
  if (basis === null && workoutsDone !== null && workoutsPlanned !== null && workoutsPlanned > 0) {
    basis = clampPct((workoutsDone / workoutsPlanned) * 100);
  }

  return {
    mentorshipId: i.mentorshipId,
    weekStart: i.weekStart,
    weekEnd,
    weekIndex: weekIndexOf(i.startedIso, i.weekStart),
    complete: weekEnd < i.todayIso,
    routineRate,
    routineDelta,
    workoutsDone,
    workoutsPlanned,
    sleepAvgMinutes: avgSleep(days.map((d) => d.sleepMinutes)),
    streak: i.streak,
    days,
    grade: gradeOf(basis),
  };
}

/** ورودی ناشناخته (JSON ذخیره‌شده) را به CoachWeekData امن تبدیل می‌کند؛ نامعتبر = null */
export function parseWeekData(raw: unknown, mentorshipId: string, weekStart: string): CoachWeekData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  if (!Array.isArray(r.days)) return null;
  const days: CoachWeekDay[] = (r.days as unknown[]).slice(0, 7).map((x, idx) => {
    const d = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    return {
      date: isRealIso(d.date) ? d.date : addDaysIso(weekStart, idx),
      routineRate: num(d.routineRate),
      workout: typeof d.workout === "boolean" ? d.workout : null,
      sleepMinutes: num(d.sleepMinutes),
    };
  });
  while (days.length < 7) days.push({ date: addDaysIso(weekStart, days.length), routineRate: null, workout: null, sleepMinutes: null });
  const grade: CoachGrade = r.grade === "great" || r.grade === "good" || r.grade === "low" || r.grade === "none" ? r.grade : "none";
  return {
    mentorshipId,
    weekStart,
    weekEnd: weekEndOf(weekStart),
    weekIndex: Math.max(1, num(r.weekIndex) ?? 1),
    complete: r.complete !== false,
    routineRate: num(r.routineRate),
    routineDelta: num(r.routineDelta),
    workoutsDone: num(r.workoutsDone),
    workoutsPlanned: num(r.workoutsPlanned),
    sleepAvgMinutes: num(r.sleepAvgMinutes),
    streak: num(r.streak),
    days,
    grade,
  };
}

/** نمره از روی گزارش آماده: اول روتین، وگرنه نسبت جلسه‌های تمرین به برنامه */
export function gradeFromData(d: Pick<CoachWeekData, "routineRate" | "workoutsDone" | "workoutsPlanned">): CoachGrade {
  let basis = d.routineRate;
  if (basis === null && d.workoutsDone !== null && d.workoutsPlanned !== null && d.workoutsPlanned > 0) {
    basis = clampPct((d.workoutsDone / d.workoutsPlanned) * 100);
  }
  return gradeOf(basis);
}

export type WeekVisibility = { progress: boolean; workouts: boolean; sleep: boolean };

/**
 * عکس ذخیره‌شده‌ی هفته ممکنه قبل از بستن دسترسی توسط شاگرد ساخته شده باشه؛
 * هر بار که خونده می‌شه با حریم خصوصی *فعلی* ماسک می‌شه. پنهان = null.
 */
export function maskWeekData(d: CoachWeekData, v: WeekVisibility): CoachWeekData {
  const out: CoachWeekData = {
    ...d,
    days: d.days.map((x) => ({
      ...x,
      routineRate: v.progress ? x.routineRate : null,
      workout: v.workouts ? x.workout : null,
      sleepMinutes: v.sleep ? x.sleepMinutes : null,
    })),
    routineRate: v.progress ? d.routineRate : null,
    routineDelta: v.progress ? d.routineDelta : null,
    streak: v.progress ? d.streak : null,
    workoutsDone: v.workouts ? d.workoutsDone : null,
    workoutsPlanned: v.workouts ? d.workoutsPlanned : null,
    sleepAvgMinutes: v.sleep ? d.sleepAvgMinutes : null,
  };
  out.grade = gradeFromData(out);
  return out;
}
