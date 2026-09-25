import { describe, it, expect } from "vitest";
import { getWeekRange, daysOfWeek, daysElapsed, isCurrentWeek, weekLabelFa, daysOfWeekIso } from "@/lib/weeklyAnalysis/week";
import { consistencyFor, dayScores, gradeFor, overallScore, confidenceFor, longestStreak } from "@/lib/weeklyAnalysis/score";
import { buildInsights, correlate, findCorrelations } from "@/lib/weeklyAnalysis/insights";
import { buildAchievements } from "@/lib/weeklyAnalysis/achievements";
import { predictWeek } from "@/lib/weeklyAnalysis/prediction";
import { routineWeeks, tasksWeeks, nutritionDayScore, sleepDurationScore, tradeDisciplineScore, type TradeRow } from "@/lib/weeklyAnalysis/domains";
import type { DayCell } from "@/lib/weeklyAnalysis/types";

// موتورِ آنالیز هفتگی — فقط توابعِ خالص (بدون دیتابیس).

describe("week range", () => {
  it("هفته شنبه تا جمعه‌ست و نیمه‌شبِ UTC برمی‌گردونه", () => {
    // 2026-09-25 جمعه‌ست
    const r = getWeekRange("Asia/Tehran", 0, new Date("2026-09-25T10:00:00Z"));
    expect(r.weekStartIso).toBe("2026-09-19");
    expect(r.weekEndIso).toBe("2026-09-25");
    expect(r.weekStart.toISOString()).toBe("2026-09-19T00:00:00.000Z");
    expect(r.weekStart.getUTCDay()).toBe(6);
    expect(daysOfWeek(r.weekStart).map((d) => d.toISOString().slice(0, 10))).toEqual(daysOfWeekIso("2026-09-19"));
  });

  it("مرزِ روز با timezone کاربر حساب می‌شه نه UTC", () => {
    // 20:45Z جمعه = 00:15 شنبه در تهران → هفته‌ی جدید
    const ref = new Date("2026-09-25T20:45:00Z");
    expect(getWeekRange("Asia/Tehran", 0, ref).weekStartIso).toBe("2026-09-26");
    expect(getWeekRange("UTC", 0, ref).weekStartIso).toBe("2026-09-19");
    expect(getWeekRange("Asia/Tehran", -1, ref).weekStartIso).toBe("2026-09-19");
  });

  it("شبِ تغییرِ ساعت (DST) نیویورک رو درست رد می‌کنه", () => {
    // 2026-03-08 شروع DST در آمریکا. 03:30Z دوشنبه ۹ مارس = یکشنبه ۸ مارس 23:30 EDT
    const r = getWeekRange("America/New_York", 0, new Date("2026-03-09T03:30:00Z"));
    expect(r.weekStartIso).toBe("2026-03-07");
    expect(r.weekEndIso).toBe("2026-03-13");
    // روزها همیشه دقیقا ۲۴ ساعت از هم فاصله دارن (تاریخِ تقویمی، نه ساعت محلی)
    const days = daysOfWeek(r.weekStart);
    expect(days[1].getTime() - days[0].getTime()).toBe(86_400_000);
  });

  it("timezone نامعتبر به تهران برمی‌گرده به‌جای throw", () => {
    expect(() => getWeekRange("Not/AZone", 0, new Date("2026-09-25T10:00:00Z"))).not.toThrow();
  });

  it("daysElapsed و isCurrentWeek", () => {
    const ref = new Date("2026-09-22T10:00:00Z"); // سه‌شنبه
    expect(daysElapsed("UTC", "2026-09-19", ref)).toBe(4);
    expect(daysElapsed("UTC", "2026-09-12", ref)).toBe(7);
    expect(daysElapsed("UTC", "2026-09-26", ref)).toBe(0);
    expect(isCurrentWeek("UTC", "2026-09-19", ref)).toBe(true);
    expect(isCurrentWeek("UTC", "2026-09-12", ref)).toBe(false);
  });

  it("برچسبِ جلالی", () => {
    // ۲۲ مهر ۱۴۰۵ = 2026-10-14 → شنبه 2026-10-10 = ۱۸ مهر
    expect(weekLabelFa("2026-10-10")).toBe("۱۸ تا ۲۴ مهر");
    // 2026-09-19 = ۲۸ شهریور → دو ماه
    expect(weekLabelFa("2026-09-19")).toBe("۲۸ شهریور تا ۳ مهر");
  });
});

describe("score", () => {
  it("grade thresholds", () => {
    expect(gradeFor(90)).toBe("S");
    expect(gradeFor(89)).toBe("A");
    expect(gradeFor(80)).toBe("A");
    expect(gradeFor(65)).toBe("B");
    expect(gradeFor(50)).toBe("C");
    expect(gradeFor(49)).toBe("D");
    expect(gradeFor(null)).toBeNull();
  });

  it("overall فقط دامنه‌های دارای داده رو وزن‌دار میانگین می‌گیره", () => {
    expect(overallScore([{ domain: "sleep", score: 80 }, { domain: "tasks", score: 60 }, { domain: "trading", score: null }])).toBe(70);
    // روتین وزن 1.2 داره
    expect(overallScore([{ domain: "routine", score: 100 }, { domain: "sleep", score: 0 }])).toBe(Math.round(120 / 2.2));
    expect(overallScore([{ domain: "sleep", score: null }])).toBeNull();
  });

  it("dayScores: null صفر حساب نمی‌شه", () => {
    const ds = dayScores([
      { domain: "sleep", daily: [80, null, null, null, null, null, null] },
      { domain: "tasks", daily: [60, 40, null, null, null, null, null] },
    ]);
    expect(ds.slice(0, 3)).toEqual([70, 40, null]);
  });

  it("consistency", () => {
    expect(consistencyFor([70, 70, 70])).toBe(100);
    expect(consistencyFor([0, 100])).toBe(0);
    expect(consistencyFor([80])).toBeNull();
    expect(consistencyFor([60, null, 80])).toBe(80);
  });

  it("confidence و streak", () => {
    expect(confidenceFor(6, 7)).toBe("high");
    expect(confidenceFor(3, 7)).toBe("medium");
    expect(confidenceFor(3, 3)).toBe("high");
    expect(confidenceFor(1, 7)).toBe("low");
    expect(longestStreak([80, 90, null, 70, 75, 71, 10])).toBe(3);
  });
});

function cells(scores: (number | null)[], future = 0): DayCell[] {
  const names = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  return scores.map((s, i) => ({
    date: `2026-09-${String(19 + i).padStart(2, "0")}`,
    weekday: names[i],
    score: i >= 7 - future ? null : s,
    isToday: false,
    isFuture: i >= 7 - future,
  }));
}

describe("insights", () => {
  it("correlation به حداقل ۲ روز در هر گروه نیاز داره", () => {
    // فقط یک روزِ «خواب بد»
    expect(correlate([90, 80, 85, 40, null, null, null], [90, 85, 88, 30, null, null, null])).toBeNull();
    const c = correlate([90, 80, 40, 30, null, null, null], [90, 80, 50, 60, null, null, null]);
    expect(c).toEqual({ diff: 30, goodN: 2, badN: 2 });
  });

  it("اختلافِ کمتر از ۱۰ امتیاز گفته نمی‌شه", () => {
    expect(correlate([90, 80, 40, 30], [70, 70, 65, 66])).toBeNull();
  });

  it("جفتِ آینه‌ای فقط یک‌بار میاد و متن عدد واقعی داره", () => {
    const domains = [
      { domain: "sleep" as const, score: 60, prevScore: null, delta: null, daily: [90, 85, 40, 30, 88, null, null] },
      { domain: "routine" as const, score: 60, prevScore: null, delta: null, daily: [90, 80, 50, 40, 85, null, null] },
    ];
    expect(findCorrelations(domains)).toHaveLength(1);
    const ins = buildInsights({ domains, days: cells([90, 82, 45, 35, 86, null, null]), overallScore: 70, prevOverallScore: null, history: [] });
    const corr = ins.find((i) => i.kind === "correlation")!;
    expect(corr).toBeDefined();
    expect(corr.body).toMatch(/\d+ واحد بهتر/);
    expect(ins.length).toBeLessThanOrEqual(6);
  });

  it("improvement/decline، best/worst و streak", () => {
    const ins = buildInsights({
      domains: [{ domain: "tasks", score: 80, prevScore: 60, delta: 20, daily: [80, 80, 80, 80, 80, 40, 90] }],
      days: cells([80, 80, 80, 80, 80, 40, 90]),
      overallScore: 76,
      prevOverallScore: 60,
      history: [50, 55, 60],
    });
    const kinds = ins.map((i) => i.kind);
    expect(kinds).toContain("improvement");
    expect(kinds).toContain("streak");
    expect(ins.length).toBeLessThanOrEqual(6);
    expect(new Set(ins.map((i) => i.id)).size).toBe(ins.length);
  });

  it("داده‌ی کم = بینشِ ساختگی نداره", () => {
    const ins = buildInsights({
      domains: [{ domain: "sleep", score: 70, prevScore: null, delta: null, daily: [70, null, null, null, null, null, null] }],
      days: cells([70, null, null, null, null, null, null]),
      overallScore: 70,
      prevOverallScore: null,
      history: [],
    });
    expect(ins).toEqual([]);
  });
});

describe("achievements", () => {
  it("فقط دامنه‌های فعال + عمومی‌ها", () => {
    const a = buildAchievements({
      domains: [
        { domain: "routine", hasData: true, daily: [100, 80, null, null, null, null, null], meta: { perfectDays: 1, maxDay: 100 } },
        { domain: "fitness", hasData: true, daily: [100, null, 100, null, null, null, null], meta: { planned: 3, done: 2, extra: 0 } },
      ],
      days: cells([90, 80, 75, 72, 71, 30, 30]),
      score: 82,
      prevScore: 70,
      grade: "A",
      activeDays: 7,
    });
    const by = Object.fromEntries(a.map((x) => [x.key, x]));
    expect(by.perfect_day.unlocked).toBe(true);
    expect(by.fitness_all_sessions.unlocked).toBe(false);
    expect(by.fitness_all_sessions.progress).toEqual({ current: 2, target: 3 });
    expect(by.all_days_active.unlocked).toBe(true);
    expect(by.beat_last_week.unlocked).toBe(true);
    expect(by.grade_a.unlocked).toBe(true);
    expect(by.streak_5.unlocked).toBe(true);
    expect(by.sleep_7h_5days).toBeUndefined();
    expect(by.trading_checklist_week).toBeUndefined();
  });
});

describe("prediction", () => {
  const base = { isCurrentWeek: true, currentScore: 70, baseline: [60, 60, 60, 60] };
  it("فقط هفته‌ی جاری با حداقل ۲ روز", () => {
    expect(predictWeek({ ...base, isCurrentWeek: false, daysElapsed: 7, dayScores: [70, 70, 70, 70, 70, 70, 70] })).toBeNull();
    expect(predictWeek({ ...base, daysElapsed: 1, dayScores: [70, null, null, null, null, null, null] })).toBeNull();
  });

  it("با baseline ترکیب می‌شه و بازه اطرافِ عدده", () => {
    const p = predictWeek({ ...base, daysElapsed: 3, dayScores: [70, 70, 70, null, null, null, null] })!;
    expect(p.projectedScore).toBeLessThan(70);
    expect(p.projectedScore).toBeGreaterThan(60);
    expect(p.low).toBeLessThanOrEqual(p.projectedScore);
    expect(p.high).toBeGreaterThanOrEqual(p.projectedScore);
    expect(p.message).toContain(String(p.projectedScore));
  });
});

describe("domain helpers", () => {
  const env = { timezone: "UTC", todayIso: "2026-09-21" };
  const weeks = [{ weekStartIso: "2026-09-19", days: daysOfWeekIso("2026-09-19") }];

  it("روتین: روزِ آینده null، امروزِ بی‌تیک null", () => {
    const [w] = routineWeeks(
      [
        { date: new Date("2026-09-19T00:00:00Z"), completedItems: { a: true, b: true } },
        { date: new Date("2026-09-20T00:00:00Z"), completedItems: { a: true, b: false } },
        { date: new Date("2026-09-21T00:00:00Z"), completedItems: { a: false, b: false } },
      ],
      weeks,
      env
    );
    expect(w.result.daily).toEqual([100, 50, null, null, null, null, null]);
    expect(w.result.score).toBe(75);
    expect(w.meta.perfectDays).toBe(1);
  });

  it("کارها: عقب‌افتاده و انجامِ دیرهنگام", () => {
    const [w] = tasksWeeks(
      [
        { dueDate: new Date("2026-09-19T10:00:00Z"), completedAt: new Date("2026-09-19T12:00:00Z") },
        { dueDate: new Date("2026-09-19T10:00:00Z"), completedAt: new Date("2026-09-20T12:00:00Z") },
        { dueDate: new Date("2026-09-20T10:00:00Z"), completedAt: null },
      ],
      weeks,
      env
    );
    expect(w.result.daily.slice(0, 2)).toEqual([75, 0]);
    expect(w.meta.overdue).toBe(1);
  });

  it("امتیازِ خواب/تغذیه/انضباط ترید", () => {
    expect(sleepDurationScore(8, null)).toBe(100);
    expect(sleepDurationScore(6, null)).toBe(65);
    expect(nutritionDayScore(2000, 2000)).toBe(100);
    expect(nutritionDayScore(2200, 2000)).toBe(90);
    const t: TradeRow = {
      openedAt: new Date(), status: "CLOSED", result: "LOSS", pnl: -10, symbol: "EURUSD",
      checklistDone: 5, checklistTotal: 5, followedPlan: true, stopLoss: 1.1,
      entryReasons: ["STRATEGY"], exitReasons: [], emotionBefore: "CALM", account: { currency: "USD" },
    };
    // ضرر مهم نیست؛ انضباط کامل = 100
    expect(tradeDisciplineScore(t)).toBe(100);
    expect(tradeDisciplineScore({ ...t, entryReasons: ["FOMO"], followedPlan: false })).toBeLessThan(70);
  });
});
