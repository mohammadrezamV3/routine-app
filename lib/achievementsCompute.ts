// محاسبه‌ی خالصِ متریک‌های اچیومنت (بدونِ prisma) — ورودی: داده‌ی خامِ کاربر،
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
  /** دقیقه‌ی هدفِ بیداری/خواب از تنظیمات (wakeSleepTimes) */
  wakeTargetMin: number;
  sleepTargetMin: number;
  /** شب‌های ثبت‌شده: مدت (دقیقه) و دقیقه‌ی محلیِ به‌خواب‌رفتن */
  sleeps: { iso: string; durationMin: number; bedMin: number }[];
  routineItems: number;
};

const dateOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

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
  let run = 0, best = 0, brokeBig = false, comeback = false;
  for (const x of days) {
    if (!x.planned) continue;
    if (x.perfect) {
      run++;
      best = Math.max(best, run);
      if (brokeBig && run >= 7) comeback = true;
    } else if (x.iso !== inp.todayIso) {
      if (run >= 3) brokeBig = true;
      run = 0;
    }
  }

  let totalTicks = 0, activeDays = 0, earlyWakes = 0;
  for (const [iso, rec] of Object.entries(inp.daily)) {
    if (iso > inp.todayIso) continue;
    const n = Object.values(rec.tasks).filter(Boolean).length;
    totalTicks += n;
    if (n > 0) activeDays++;
    if (rec.wakeMin !== null && rec.wakeMin !== undefined && rec.wakeMin <= inp.wakeTargetMin && rec.wakeMin >= inp.wakeTargetMin - 240) earlyWakes++;
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

  // ماه‌های شمسیِ کاملا گذشته که همه‌ی روزهای برنامه‌دارش کامل بوده
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

  // بهترین میانگینِ ۳۰ روزه (فقط پنجره‌هایی با حداقل ۲۰ روزِ برنامه‌دار)
  let best30Avg = 0;
  for (let i = 29; i < days.length; i++) {
    const win = days.slice(i - 29, i + 1).filter((x) => x.planned);
    if (win.length < 20) continue;
    best30Avg = Math.max(best30Avg, Math.floor(win.reduce((s, x) => s + x.pct, 0) / win.length));
  }

  // خواب
  const sleeps = [...inp.sleeps].sort((a, b) => a.iso.localeCompare(b.iso));
  const sleepLogs = sleeps.length;
  const sleepGoalNights = sleeps.filter((s) => s.durationMin >= 420 && s.durationMin <= 540).length;
  let sRun = 0, sBest = 0, prevIso: string | null = null;
  for (const s of sleeps) {
    const consecutive = prevIso !== null && isoLocal(addDays(dateOf(prevIso), 1)) === s.iso;
    const onTarget = circularDiff(s.bedMin, inp.sleepTargetMin) <= 30;
    sRun = onTarget ? (consecutive ? sRun + 1 : 1) : 0;
    sBest = Math.max(sBest, sRun);
    prevIso = s.iso;
  }

  const memberDays = Math.max(0, Math.floor((today.getTime() - dateOf(inp.createdAtIso).getTime()) / 86_400_000));

  return {
    currentStreak: computeRoutineStreak(today, inp.opts, inp.daily, 400).streak,
    bestStreak: Math.max(best, computeRoutineStreak(today, inp.opts, inp.daily, 400).streak),
    perfectDays,
    totalTicks,
    activeDays,
    perfectWeeks,
    perfectMonths,
    comeback,
    routineItems: inp.routineItems,
    memberDays,
    perfectFridays,
    earlyWakes,
    sleepLogs,
    sleepGoalNights,
    sleepConsistentRun: sBest,
    best30Avg,
  };
}
