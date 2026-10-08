// محاسبه‌ی خالص متریک‌های اچیومنت (بدون prisma) — ورودی: داده‌ی خام کاربر،
// خروجی: AchievementMetrics. جدا از achievementsServer.ts تا تست‌پذیر باشه.

import { isoLocal, jalaliToIso, toJalali } from "./jalali";
import { tasksForDate, type ScheduleOpts } from "./schedule";
import { computeRoutineStreak } from "./routineStreak";
import type { AchievementMetrics } from "./achievements";

export type AchievementInput = {
  todayIso: string;
  createdAtIso: string;
  opts: ScheduleOpts;
  daily: Record<string, { tasks: Record<string, boolean>; wakeMin?: number | null }>;
  /** دقیقه‌ی هدف بیداری/خواب از تنظیمات (wakeSleepTimes) */
  wakeTargetMin: number;
  sleepTargetMin: number;
  /** شب‌های ثبت‌شده: مدت (دقیقه) و دقیقه‌ی محلی به‌خواب‌رفتن */
  sleeps: { iso: string; durationMin: number; bedMin: number }[];
  routineItems: number;
  /** روزهایی (iso) که جلسه‌ی تمرین کامل شده */
  workoutDates?: string[];
  /** کالری کل هر روزی که حداقل یک وعده ثبت شده */
  calorieDays?: { iso: string; kcal: number }[];
  /** بازه‌های هدف کالری (toIso منحصر؛ null = هنوز فعال) */
  calorieTargets?: { fromIso: string; toIso: string | null; kcal: number }[];
  /** معاملات به ترتیب زمان ورود */
  trades?: { openedAtMs: number; journaled: boolean; checklistFull: boolean; followedPlan: boolean | null; reflected: boolean }[];
  menteeProgramsDone?: number;
  mentorStudents?: number;
};

const dateOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const nextIso = (iso: string) => isoLocal(addDays(dateOf(iso), 1));

/** شنبه‌ی هفته‌ی یک روز (هفته‌ی شمسی شنبه تا جمعه) */
function weekStartIso(iso: string): string {
  const d = dateOf(iso);
  return isoLocal(addDays(d, -((d.getDay() + 1) % 7)));
}

/** بلندترین زنجیره‌ی روزهای پشت‌سرهم در یک فهرست iso (تکراری‌ها یکی) */
export function longestDayRun(isos: string[]): number {
  const list = [...new Set(isos)].sort();
  let run = 0, best = 0;
  for (let i = 0; i < list.length; i++) {
    run = i > 0 && nextIso(list[i - 1]) === list[i] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** فاصله‌ی دایره‌ای دو دقیقه‌ی شبانه‌روز (۲۳:۵۰ و ۰۰:۱۰ = ۲۰ دقیقه) */
export function circularDiff(a: number, b: number) {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

export function computeAchievementMetrics(inp: AchievementInput): AchievementMetrics {
  const today = dateOf(inp.todayIso);
  const firstEntry = Object.keys(inp.daily).sort()[0];
  const startIso = [inp.createdAtIso, firstEntry].filter(Boolean).sort()[0] ?? inp.todayIso;
  const start = dateOf(startIso);

  // pct و «کامل» برای هر روز از شروع تا امروز
  const days: { iso: string; d: Date; planned: boolean; perfect: boolean; pct: number }[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const iso = isoLocal(d);
    const expected = tasksForDate(d, inp.opts);
    const rec = inp.daily[iso];
    const done = rec ? expected.filter((t) => rec.tasks[t.id]).length : 0;
    days.push({ iso, d, planned: expected.length > 0, perfect: expected.length > 0 && done === expected.length, pct: expected.length ? (done / expected.length) * 100 : 0 });
  }
  const byIso = new Map(days.map((x) => [x.iso, x]));

  // بهترین استریک + «بازگشت»: زنجیره‌ای ≥۳ شکست و بعدش زنجیره‌ای ≥۷ ساخته شد
  // هر بازگشت یک بار شمرده می‌شه و برای بازگشت بعدی دوباره یک شکست ≥3 لازمه
  let run = 0, best = 0, brokeBig = false, comebacks = 0;
  for (const x of days) {
    if (!x.planned) continue;
    if (x.perfect) {
      run++;
      best = Math.max(best, run);
      if (brokeBig && run >= 7) { comebacks++; brokeBig = false; }
    } else if (x.iso !== inp.todayIso) {
      if (run >= 3) brokeBig = true;
      run = 0;
    }
  }

  let totalTicks = 0, activeDays = 0, earlyWakes = 0, earlyRun = 0, earlyBest = 0;
  let prevEarly: string | null = null;
  for (const [iso, rec] of Object.entries(inp.daily).sort(([a], [b]) => a.localeCompare(b))) {
    if (iso > inp.todayIso) continue;
    const n = Object.values(rec.tasks).filter(Boolean).length;
    totalTicks += n;
    if (n > 0) activeDays++;
    if (rec.wakeMin !== null && rec.wakeMin !== undefined && rec.wakeMin <= inp.wakeTargetMin && rec.wakeMin >= inp.wakeTargetMin - 240) {
      earlyWakes++;
      earlyRun = prevEarly !== null && nextIso(prevEarly) === iso ? earlyRun + 1 : 1;
      earlyBest = Math.max(earlyBest, earlyRun);
      prevEarly = iso;
    }
  }

  const perfectDays = days.filter((x) => x.perfect).length;
  const perfectFridays = days.filter((x) => x.perfect && x.d.getDay() === 5).length;

  // هفته‌های شنبه..جمعه‌ی کامل (هفته‌ی جاری فقط اگه تا جمعه تموم شده باشه)
  let perfectWeeks = 0;
  const firstSat = addDays(start, (6 - start.getDay() + 7) % 7);
  for (let w = firstSat; addDays(w, 6) <= today; w = addDays(w, 7)) {
    let planned = 0, ok = true;
    for (let i = 0; i < 7; i++) {
      const x = byIso.get(isoLocal(addDays(w, i)));
      if (!x) { ok = false; break; }
      if (x.planned) { planned++; if (!x.perfect) { ok = false; break; } }
    }
    if (ok && planned > 0) perfectWeeks++;
  }

  // ماه‌های شمسی کاملا گذشته که همه‌ی روزهای برنامه‌دارش کامل بوده
  let perfectMonths = 0;
  const [sy, sm] = toJalali(start.getFullYear(), start.getMonth() + 1, start.getDate());
  const [ty, tm] = toJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  for (let y = sy, m = sm; y < ty || (y === ty && m < tm); m === 12 ? (y++, m = 1) : m++) {
    let planned = 0, ok = true;
    for (let d = 1; d <= 31; d++) {
      const iso = jalaliToIso(y, m, d);
      if (!iso) continue;
      const x = byIso.get(iso);
      if (!x) { ok = false; break; } // ماهی که قبل از عضویت شروع شده حساب نمی‌شه
      if (x.planned) { planned++; if (!x.perfect) { ok = false; break; } }
    }
    if (ok && planned >= 20) perfectMonths++;
  }

  // بهترین میانگین 30/90 روزه (فقط پنجره‌هایی با حداقل دو سوم روز برنامه‌دار)
  // با جمع پیشوندی — O(n) برای هر طول پنجره
  const preN = [0], preP = [0];
  for (const x of days) {
    preN.push(preN[preN.length - 1] + (x.planned ? 1 : 0));
    preP.push(preP[preP.length - 1] + (x.planned ? x.pct : 0));
  }
  const bestAvg = (len: number, minPlanned: number) => {
    let b = 0;
    for (let i = len; i <= days.length; i++) {
      const n = preN[i] - preN[i - len];
      if (n < minPlanned) continue;
      b = Math.max(b, Math.floor((preP[i] - preP[i - len]) / n));
    }
    return b;
  };
  const best30Avg = bestAvg(30, 20);
  const best90Avg = bestAvg(90, 60);

  // خواب
  const sleeps = [...inp.sleeps].sort((a, b) => a.iso.localeCompare(b.iso));
  const sleepLogs = sleeps.length;
  const sleepGoalNights = sleeps.filter((s) => s.durationMin >= 420 && s.durationMin <= 540).length;
  let sRun = 0, sBest = 0, prevIso: string | null = null;
  for (const s of sleeps) {
    const consecutive = prevIso !== null && nextIso(prevIso) === s.iso;
    const onTarget = circularDiff(s.bedMin, inp.sleepTargetMin) <= 30;
    sRun = onTarget ? (consecutive ? sRun + 1 : 1) : 0;
    sBest = Math.max(sBest, sRun);
    prevIso = s.iso;
  }
  const sleepLogRun = longestDayRun(sleeps.map((s) => s.iso));

  // تمرین: روزهای جلسه‌ی کامل + هفته‌های پشت‌سرهم (شنبه تا جمعه) با حداقل 3 جلسه.
  // هفته‌ی جاری زنجیره رو نمی‌شکنه، فقط اگه به 3 رسیده باشه بهش اضافه می‌کنه.
  const workoutDates = [...new Set(inp.workoutDates ?? [])].filter((d) => d <= inp.todayIso).sort();
  const perWeek = new Map<string, number>();
  for (const iso of workoutDates) {
    const k = weekStartIso(iso);
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  }
  let wRun = 0, wBest = 0;
  if (workoutDates.length) {
    const thisWeek = weekStartIso(inp.todayIso);
    for (let w = weekStartIso(workoutDates[0]); w <= thisWeek; w = isoLocal(addDays(dateOf(w), 7))) {
      if ((perWeek.get(w) ?? 0) >= 3) wRun++;
      else if (w !== thisWeek) wRun = 0;
      wBest = Math.max(wBest, wRun);
    }
  }

  // تغذیه: روزهای ثبت، زنجیره‌ی ثبت، و روزهای در محدوده‌ی 10 درصدی هدف همون روز
  const calDays = (inp.calorieDays ?? []).filter((d) => d.iso <= inp.todayIso);
  const targets = [...(inp.calorieTargets ?? [])].filter((t) => t.kcal > 0).sort((a, b) => b.fromIso.localeCompare(a.fromIso));
  let calorieOnTargetDays = 0;
  for (const d of calDays) {
    const t = targets.find((x) => x.fromIso <= d.iso && (x.toIso === null || d.iso < x.toIso));
    if (t && d.kcal > 0 && Math.abs(d.kcal - t.kcal) <= t.kcal * 0.1) calorieOnTargetDays++;
  }

  // ترید
  const trades = [...(inp.trades ?? [])].sort((a, b) => a.openedAtMs - b.openedAtMs);
  let pRun = 0, pBest = 0;
  for (const t of trades) {
    pRun = t.followedPlan === true ? pRun + 1 : 0;
    pBest = Math.max(pBest, pRun);
  }

  const memberDays = Math.max(0, Math.floor((today.getTime() - dateOf(inp.createdAtIso).getTime()) / 86_400_000));

  const currentStreak = computeRoutineStreak(today, inp.opts, inp.daily, 400).streak;

  return {
    currentStreak,
    bestStreak: Math.max(best, currentStreak),
    perfectDays,
    totalTicks,
    activeDays,
    perfectWeeks,
    perfectMonths,
    comeback: comebacks > 0,
    comebacks,
    routineItems: inp.routineItems,
    memberDays,
    perfectFridays,
    earlyWakes,
    earlyWakeRun: earlyBest,
    sleepLogs,
    sleepLogRun,
    sleepGoalNights,
    sleepConsistentRun: sBest,
    best30Avg,
    best90Avg,
    workoutSessions: workoutDates.length,
    workoutWeekRun: wBest,
    calorieLogDays: new Set(calDays.map((d) => d.iso)).size,
    calorieLogRun: longestDayRun(calDays.map((d) => d.iso)),
    calorieOnTargetDays,
    tradesJournaled: trades.filter((t) => t.journaled).length,
    tradesChecklistFull: trades.filter((t) => t.checklistFull).length,
    tradePlanRun: pBest,
    tradesReflected: trades.filter((t) => t.reflected).length,
    menteeProgramsDone: inp.menteeProgramsDone ?? 0,
    mentorStudents: inp.mentorStudents ?? 0,
  };
}
