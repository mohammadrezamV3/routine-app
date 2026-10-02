import { describe, it, expect } from "vitest";
import { computeRoutineStreak } from "@/lib/routineStreak";
import { computeAchievementMetrics, circularDiff } from "@/lib/achievementsCompute";
import { ACHIEVEMENTS, evaluateAchievements, allUnlocked } from "@/lib/achievements";
import { isoLocal } from "@/lib/jalali";
import type { ScheduleOpts } from "@/lib/schedule";

// یک برنامه‌ی «هر روز» (۷ occurrence با id های جدا، هر روز هفته یکی)
const everyDay: ScheduleOpts = {
  removedOccurrences: new Set(),
  customOccurrences: Array.from({ length: 7 }, (_, d) => ({ id: `t${d}`, name: "ورزش", jsDay: d, time: "08:00" })),
};
const today = new Date(2026, 8, 30); // سه‌شنبه
const iso = (back: number) => isoLocal(new Date(2026, 8, 30 - back));
const done = (back: number) => ({ tasks: { [`t${new Date(2026, 8, 30 - back).getDay()}`]: true } });

describe("computeRoutineStreak", () => {
  it("امروز ناقص حساب نمی‌شه ولی استریک رو هم نمی‌شکنه", () => {
    const daily = { [iso(1)]: done(1), [iso(2)]: done(2) };
    expect(computeRoutineStreak(today, everyDay, daily).streak).toBe(2);
  });
  it("همون لحظه‌ای که امروز کامل شد، یکی اضافه می‌شه", () => {
    const daily = { [iso(0)]: done(0), [iso(1)]: done(1), [iso(2)]: done(2) };
    const r = computeRoutineStreak(today, everyDay, daily);
    expect(r.streak).toBe(3);
    expect(r.todayCounted).toBe(true);
  });
  it("روز ناقص دیروز زنجیره رو می‌شکنه", () => {
    const daily = { [iso(0)]: done(0), [iso(2)]: done(2), [iso(3)]: done(3) };
    expect(computeRoutineStreak(today, everyDay, daily).streak).toBe(1);
  });
  it("روز بی‌برنامه رد می‌شه، نه شکست", () => {
    // فقط شنبه..پنج‌شنبه برنامه؛ جمعه (jsDay 5) خالی
    const noFri: ScheduleOpts = { removedOccurrences: new Set(), customOccurrences: everyDay.customOccurrences.filter((c) => c.jsDay !== 5) };
    const daily: Record<string, { tasks: Record<string, boolean> }> = {};
    for (let b = 1; b <= 6; b++) if (new Date(2026, 8, 30 - b).getDay() !== 5) daily[iso(b)] = done(b);
    expect(computeRoutineStreak(today, noFri, daily, 6).streak).toBe(5);
  });
});

describe("computeAchievementMetrics", () => {
  const base = {
    todayIso: iso(0),
    createdAtIso: iso(20),
    opts: everyDay,
    wakeTargetMin: 8 * 60,
    sleepTargetMin: 23 * 60 + 30,
    sleeps: [] as { iso: string; durationMin: number; bedMin: number }[],
    routineItems: 7,
  };

  it("بهترین استریک، بازگشت، روزهای کامل و تیک‌ها", () => {
    const daily: Record<string, { tasks: Record<string, boolean>; wakeMin?: number | null }> = {};
    // ۲۰..۱۶ کامل (۵ روز)، ۱۵ ناقص، ۱۴..۰ کامل (۱۵ روز)
    for (let b = 20; b >= 0; b--) if (b !== 15) daily[iso(b)] = { ...done(b), wakeMin: 7 * 60 + 50 };
    const m = computeAchievementMetrics({ ...base, daily });
    expect(m.bestStreak).toBe(15);
    expect(m.currentStreak).toBe(15);
    expect(m.comeback).toBe(true);
    expect(m.perfectDays).toBe(20);
    expect(m.totalTicks).toBe(20);
    expect(m.activeDays).toBe(20);
    expect(m.earlyWakes).toBe(20);
    expect(m.perfectWeeks).toBeGreaterThanOrEqual(1);
  });

  it("خواب: شب هدف و پیوستگی ساعت خواب (دایره‌ای، دور نیمه‌شب)", () => {
    const sleeps = [
      { iso: iso(3), durationMin: 450, bedMin: 23 * 60 + 40 },
      { iso: iso(2), durationMin: 480, bedMin: 5 }, // 00:05 — ۳۵ دقیقه با 23:30 → خارج
      { iso: iso(1), durationMin: 400, bedMin: 23 * 60 + 15 },
      { iso: iso(0), durationMin: 500, bedMin: 23 * 60 + 50 },
    ];
    const m = computeAchievementMetrics({ ...base, daily: {}, sleeps });
    expect(m.sleepLogs).toBe(4);
    expect(m.sleepGoalNights).toBe(3);
    expect(m.sleepConsistentRun).toBe(2);
    expect(circularDiff(23 * 60 + 50, 10)).toBe(20);
  });

  it("کاتالوگ: شناسه‌ها یکتا، و همه‌ی متریک‌های بالا → همه باز", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const max = {
      currentStreak: 999, bestStreak: 999, perfectDays: 9999, totalTicks: 99999, activeDays: 9999, perfectWeeks: 99, perfectMonths: 99,
      comeback: true, routineItems: 99, memberDays: 9999, perfectFridays: 99, earlyWakes: 999, sleepLogs: 999, sleepGoalNights: 999,
      sleepConsistentRun: 99, best30Avg: 100, comebacks: 9, earlyWakeRun: 99, sleepLogRun: 999, best90Avg: 100,
      workoutSessions: 999, workoutWeekRun: 99, calorieLogDays: 999, calorieLogRun: 99, calorieOnTargetDays: 99,
      tradesJournaled: 999, tradesChecklistFull: 999, tradePlanRun: 99, tradesReflected: 99, menteeProgramsDone: 9, mentorStudents: 9,
    };
    expect(allUnlocked(evaluateAchievements(max))).toBe(true);
    expect(allUnlocked(evaluateAchievements({ ...max, comeback: false }))).toBe(false);
  });
});
