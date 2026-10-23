import { describe, it, expect } from "vitest";
import {
  catalogMuscleToFit, computeFitWeek, exerciseKey, plannedItemsOn, readFit, weekdayKeyOfIso,
  type FitDayInput, type FitFoodRow, type FitMuscle, type FitStatus, type FitWeekInput,
} from "@/lib/weeklyLetter/fitWeek";
import {
  applyFitToLetter, fitAiSummary, fitHeadline, fitInsights, fitIntro, fitMedals, fitNextTargets, fitNextWeek, fitNumbers, fitWinsImprove,
} from "@/lib/weeklyLetter/fitWeekText";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";

// اعراب و الف همزه‌دار ممنوعن (با escape نوشته شده تا خود فایل هم تمیز بمونه)
const BAD = new RegExp("[\\u064B-\\u0652\\u0654\\u0670\\u0623\\u0625]");
const NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
// شنبه 2026-09-19 تا جمعه 2026-09-25
const DATES = ["2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"];

const MUSCLES: Record<string, FitMuscle> = {
  "پرس سینه": "chest", "پرس شیب‌دار": "chest", "زیربغل": "back", "اسکوات": "quads", "ددلیفت رومانیایی": "hamstrings", "پلانک": "abs",
};
const muscleOf = (n: string): FitMuscle[] => (MUSCLES[n] ? [MUSCLES[n]] : []);

type DayOpt = { status?: FitStatus; kcal?: number; target?: number | null; protein?: number | null; sleep?: number | null; future?: boolean; today?: boolean };
function days(opts: (DayOpt | undefined)[]): FitDayInput[] {
  return DATES.map((date, i) => {
    const o = opts[i] ?? {};
    return {
      date, weekday: NAMES[i], isToday: !!o.today, isFuture: !!o.future, status: o.status,
      nutrition: o.kcal != null ? { kcal: o.kcal, target: o.target === undefined ? 2000 : o.target, protein: o.protein ?? null } : undefined,
      sleepHours: o.sleep ?? null,
    };
  });
}

function input(over: Partial<FitWeekInput> = {}): FitWeekInput {
  return {
    days: days([]), prevDays: null, sessions: [], plannedByDate: {}, food: [],
    targets: { goal: null, kcal: 2000, protein: 120, carbs: 220, fat: 60 },
    muscleOf, hasFitness: true, hasNutrition: true, ...over,
  };
}

describe("fitWeek: ابزارهای خالص", () => {
  it("exerciseKey پسوند ست و نیم‌فاصله و ی/ک عربی رو نادیده می‌گیره", () => {
    expect(exerciseKey("پرس سینه 4×10")).toBe(exerciseKey("پرس  سینه"));
    expect(exerciseKey("كتل‌بل")).toBe(exerciseKey("کتلبل"));
  });

  it("weekdayKeyOfIso با getDay هماهنگه", () => {
    expect(weekdayKeyOfIso("2026-09-19")).toBe("شنبه");
    expect(weekdayKeyOfIso("2026-09-24")).toBe("پنجشنبه");
  });

  it("plannedItemsOn: پلن معتبر همون روز، نام روز با نیم‌فاصله، پسوند ست حذف", () => {
    const plans = [
      { start: "2026-01-01", until: "2026-09-01", planData: [{ day: "شنبه", focus: "x", items: ["قدیمی 3×10"] }] },
      { start: "2026-09-02", until: null, planData: [{ day: "شنبه", focus: "سینه", items: ["پرس سینه 4×10", "پلانک 30 ثانیه"] }, { day: "پنج‌شنبه", focus: "پا", items: ["اسکوات"] }] },
    ];
    expect(plannedItemsOn(plans, "2026-09-19")).toEqual(["پرس سینه", "پلانک"]);
    expect(plannedItemsOn(plans, "2026-09-24")).toEqual(["اسکوات"]);
    expect(plannedItemsOn(plans, "2026-09-20")).toEqual([]);
    expect(plannedItemsOn(plans, "2026-08-01")).toEqual(["قدیمی"]);
    expect(plannedItemsOn([{ start: "2026-01-01", until: null, planData: "bad" }], "2026-09-19")).toEqual([]);
  });

  it("catalogMuscleToFit: ماهیچه مایل به شکم، کاردیو نادیده", () => {
    expect(catalogMuscleToFit("obliques")).toBe("abs");
    expect(catalogMuscleToFit("chest")).toBe("chest");
    expect(catalogMuscleToFit("cardio")).toBeNull();
    expect(catalogMuscleToFit(undefined)).toBeNull();
  });
});

describe("computeFitWeek: تمرین", () => {
  const base = () => input({
    days: days([{ status: "done" }, { status: "rest" }, { status: "done" }, { status: "missed" }, { status: "done" }, { status: "extra" }, { status: "rest" }]),
    prevDays: [{ status: "done" }, { status: "missed" }, { status: "missed" }, { status: "rest" }, {}, {}, {}],
    sessions: [
      { date: DATES[0], completed: true, items: ["پرس سینه 4×10", "پلانک", "ناشناس"], startMin: 7 * 60 },
      { date: DATES[2], completed: true, items: ["اسکوات", "پرس سینه"], startMin: 7 * 60 + 30 },
      { date: DATES[4], completed: true, items: ["پرس سینه", "زیربغل"], startMin: 18 * 60 },
      { date: DATES[5], completed: true, items: ["اسکوات"], startMin: null },
    ],
    plannedByDate: {
      [DATES[0]]: ["پرس سینه", "پلانک"], [DATES[2]]: ["اسکوات", "ددلیفت رومانیایی"], [DATES[3]]: ["زیربغل"], [DATES[4]]: ["پرس سینه", "زیربغل"],
    },
  });

  it("شمارش جلسه‌ها و پایبندی با مقایسه‌ی هفته‌ی قبل", () => {
    const t = computeFitWeek(base())!.training!;
    expect(t.sessions).toEqual({ done: 3, planned: 4, extra: 1, partial: 0, missed: 1, rest: 2 });
    expect(t.adherence).toBe(75);
    expect(t.prevSessions).toEqual({ done: 1, planned: 3, extra: 0 });
    expect(t.prevAdherence).toBe(33);
  });

  it("نسبت حرکت‌ها فقط روی حرکت‌های برنامه؛ حرکت بیرون از برنامه نمی‌شمره", () => {
    const t = computeFitWeek(base())!.training!;
    // شنبه 2/2، دوشنبه 1/2، سه‌شنبه 0/1 (جاافتاده)، چهارشنبه 2/2
    expect(t.exercises).toEqual({ done: 5, planned: 7, pct: 71 });
    expect(t.days[3]).toMatchObject({ status: "missed", exDone: 0, exPlanned: 1 });
    expect(t.days[1].exPlanned).toBeNull();
  });

  it("پرتکرارها و عضله‌ها؛ اسم ناشناخته در آمار عضله نیست", () => {
    const t = computeFitWeek(base())!.training!;
    expect(t.top[0]).toEqual({ name: "پرس سینه", count: 3 });
    expect(t.top.map((x) => x.name)).toContain("ناشناس");
    const chest = t.muscles.find((m) => m.key === "chest")!;
    expect(chest.count).toBe(3);
    expect(t.muscles.find((m) => m.key === "quads")!.count).toBe(2);
    expect(t.muscles.some((m) => (m.key as string) === "ناشناس")).toBe(false);
  });

  it("گروه عضلانی جاافتاده: برنامه بود ولی صفر", () => {
    const t = computeFitWeek(base())!.training!;
    expect(t.skipped).toContain("hamstrings");
    expect(t.skipped).not.toContain("chest");
  });

  it("بدون هیچ حرکت تیک‌خورده، جاافتاده گزارش نمی‌شه", () => {
    const t = computeFitWeek(input({
      days: days([{ status: "done" }]),
      sessions: [{ date: DATES[0], completed: true, items: [], startMin: null }],
      plannedByDate: { [DATES[0]]: ["پرس سینه"] },
    }))!.training!;
    expect(t.skipped).toEqual([]);
    // جلسه تموم شده ولی بدون تیک حرکت: نامشخص، نه کامل و نه صفر
    expect(t.exercises).toEqual({ done: 0, planned: 0, pct: null });
    expect(t.days[0].exPlanned).toBeNull();
  });

  it("بلندترین زنجیره: استراحت نمی‌شکنه، جاافتاده می‌شکنه", () => {
    const mk = (s: FitStatus[]) => computeFitWeek(input({ days: days(s.map((status) => ({ status }))) }))!.training!.longestStreak;
    expect(mk(["done", "rest", "done", "rest", "extra", "missed", "done"])).toBe(3);
    expect(mk(["done", "missed", "done", "partial", "done", "done", "rest"])).toBe(2);
  });

  it("الگوی ساعت شروع فقط با دو جلسه‌ی دارای ساعت", () => {
    const t = computeFitWeek(base())!.training!;
    expect(t.start).toMatchObject({ morning: 2, evening: 1, afternoon: 0 });
    const one = computeFitWeek(input({ days: days([{ status: "done" }]), sessions: [{ date: DATES[0], completed: true, items: ["اسکوات"], startMin: 400 }] }))!.training!;
    expect(one.start).toBeNull();
  });

  it("روز آینده بدون وضعیت و بدون برنامه شمرده نمی‌شه", () => {
    const t = computeFitWeek(input({
      days: days([{ status: "done" }, { status: "done" }, { future: true }, { future: true }, { future: true }, { future: true }, { future: true }]),
    }))!.training!;
    expect(t.days[6].status).toBe("future");
    expect(t.sessions.done).toBe(2);
  });

  it("بدون دامنه‌ی بدنسازی یا بی‌داده training نیست", () => {
    expect(computeFitWeek(input({ hasFitness: false, hasNutrition: false }))).toBeNull();
    expect(computeFitWeek(input())).toBeNull();
  });
});

describe("computeFitWeek: سوخت", () => {
  const food: FitFoodRow[] = [];
  const addMeals = (date: string, split: [string | null, number][], prot: number | null = null) =>
    split.forEach(([mealType, kcal]) => food.push({ date, mealType, kcal, protein: prot, carbs: kcal / 8, fat: kcal / 30 }));

  it("کالری داخل ±10% و میانگین فقط از روزهای تمام‌شده (امروز نه)", () => {
    const f = computeFitWeek(input({
      days: days([{ kcal: 2000 }, { kcal: 2150 }, { kcal: 2500 }, { kcal: 1900 }, { kcal: 3500, today: true }, { future: true }, { future: true }]),
    }))!.fuel!;
    expect(f.loggedDays).toBe(4);
    expect(f.avgKcal).toBe(Math.round((2000 + 2150 + 2500 + 1900) / 4));
    expect(f.within).toEqual({ days: 3, of: 4 });
    expect(f.days[4]).toMatchObject({ kcal: 3500, closed: false });
  });

  it("تراز انرژی: جمع اختلاف، برآورد کیلو با 7700 و حکم بر اساس هدف", () => {
    const dd = days([{ kcal: 2300 }, { kcal: 2300 }, { kcal: 2300 }, { kcal: 2300 }, { kcal: 2300 }, { future: true }, { future: true }]);
    const mk = (goal: "cut" | "gain" | "maintain" | null) => computeFitWeek(input({ days: dd, targets: { goal, kcal: 2000, protein: null, carbs: null, fat: null } }))!.fuel!.balance!;
    const cut = mk("cut");
    expect(cut.totalDelta).toBe(1500);
    expect(cut.estKg).toBe(0.2);
    expect(cut.verdict).toBe("over");
    expect(mk("gain").verdict).toBe("aligned");
    expect(mk("maintain").verdict).toBe("over");
    expect(mk(null).verdict).toBe("over");
  });

  it("تراز انرژی با کمتر از 3 روز هدف‌دار ساخته نمی‌شه", () => {
    const f = computeFitWeek(input({ days: days([{ kcal: 2300 }, { kcal: 2300 }]) }))!.fuel!;
    expect(f.balance).toBeNull();
  });

  it("درشت‌مغذی‌ها، روزهای هدف پروتئین، سهم وعده‌ها", () => {
    food.length = 0;
    for (const d of DATES.slice(0, 5)) addMeals(d, [["breakfast", 400], ["lunch", 800], ["dinner", 600], ["snack", 200]], 30);
    const f = computeFitWeek(input({
      days: days([{ kcal: 2000, protein: 130 }, { kcal: 2000, protein: 125 }, { kcal: 2000, protein: 100 }, { kcal: 2000, protein: 118 }, { kcal: 2000, protein: 90 }, { future: true }, { future: true }]),
      food: [...food],
    }))!.fuel!;
    expect(f.macros.protein).toMatchObject({ target: 120, hitDays: 3, loggedDays: 5 }); // >= 108
    expect(f.macros.carbs.avg).toBe(250);
    expect(f.meals!.find((m) => m.key === "lunch")!.pct).toBe(40);
    expect(f.meals!.reduce((a, m) => a + m.pct, 0)).toBe(100);
  });

  it("سهم وعده‌ها وقتی بیشتر ردیف‌ها نوع وعده ندارن null", () => {
    food.length = 0;
    addMeals(DATES[0], [[null, 1500], ["lunch", 300]]);
    const f = computeFitWeek(input({ days: days([{ kcal: 1800 }]), food: [...food] }))!.fuel!;
    expect(f.meals).toBeNull();
  });

  it("روز تمرین در برابر استراحت و آخر هفته در برابر روزهای کاری", () => {
    const f = computeFitWeek(input({
      days: days([
        { status: "done", kcal: 2200, protein: 140 }, { status: "rest", kcal: 1800, protein: 100 }, { status: "done", kcal: 2200, protein: 150 },
        { status: "rest", kcal: 1800, protein: 110 }, { status: "done", kcal: 2000, protein: 120 }, { kcal: 2900 }, { kcal: 2600 },
      ]),
    }))!.fuel!;
    expect(f.trainVsRest).toMatchObject({ trainDays: 3, restDays: 2, trainKcal: 2133, restKcal: 1800, trainProtein: 137, restProtein: 105 });
    expect(f.weekend).toMatchObject({ weekendDays: 2, weekdayDays: 5, weekendAvg: 2750 });
  });

  it("مقایسه با هفته‌ی قبل", () => {
    const f = computeFitWeek(input({
      days: days([{ kcal: 2000 }, { kcal: 2000 }]),
      prevDays: [{ nutrition: { kcal: 1500, target: 2000, protein: 80 } }, { nutrition: { kcal: 2000, target: 2000, protein: 100 } }, {}, {}, {}, {}, {}],
    }))!.fuel!;
    expect(f.prev).toEqual({ avgKcal: 1750, withinDays: 1, withinOf: 2, avgProtein: 90 });
  });
});

describe("computeFitWeek: ریکاوری و readFit", () => {
  it("خواب قبل از روز تمرین در برابر روز جاافتاده", () => {
    const r = computeFitWeek(input({
      days: days([{ status: "done", sleep: 7.5 }, { status: "done", sleep: 8 }, { status: "missed", sleep: 5.5 }, { status: "missed", sleep: 6 }, { status: "rest", sleep: 9 }]),
    }))!.recovery!;
    expect(r).toEqual({ trainAvg: 7.8, trainN: 2, missedAvg: 5.8, missedN: 2, diff: 2 });
  });

  it("بدون هر دو گروه ریکاوری نیست", () => {
    expect(computeFitWeek(input({ days: days([{ status: "done", sleep: 7 }]) }))!.recovery).toBeNull();
  });

  it("readFit داده‌ی ناقص رو رد می‌کنه", () => {
    expect(readFit(null)).toBeNull();
    expect(readFit({ v: 2 })).toBeNull();
    expect(readFit({ v: 1, training: null, fuel: null })).toBeNull();
    const fit = computeFitWeek(input({ days: days([{ status: "done" }]) }))!;
    expect(readFit(JSON.parse(JSON.stringify(fit)))).toEqual(fit);
  });
});

// ───────────────────────── متن‌ها ─────────────────────────

function fullFit(over: Partial<FitWeekInput> = {}) {
  const food: FitFoodRow[] = DATES.slice(0, 6).map((date) => ({ date, mealType: "lunch", kcal: 2000, protein: 60, carbs: 200, fat: 60 }));
  return computeFitWeek(input({
    days: days([
      { status: "done", kcal: 2000, protein: 125, sleep: 7.5 }, { status: "rest", kcal: 2100, protein: 120 }, { status: "done", kcal: 1950, protein: 130, sleep: 8 },
      { status: "missed", kcal: 2050, protein: 121, sleep: 5.5 }, { status: "done", kcal: 2000, protein: 119 }, { status: "missed", kcal: 2900, protein: 100, sleep: 6 }, { kcal: 2000, protein: 125 },
    ]),
    prevDays: [{ status: "done" }, {}, { status: "done" }, { status: "done" }, { status: "done" }, { status: "done" }, {}],
    sessions: [
      { date: DATES[0], completed: true, items: ["پرس سینه", "پلانک"], startMin: 420 },
      { date: DATES[2], completed: true, items: ["اسکوات"], startMin: 430 },
      { date: DATES[4], completed: true, items: ["پرس سینه"], startMin: 440 },
    ],
    plannedByDate: { [DATES[0]]: ["پرس سینه", "پلانک"], [DATES[2]]: ["اسکوات", "ددلیفت رومانیایی"], [DATES[3]]: ["زیربغل"], [DATES[4]]: ["پرس سینه"], [DATES[5]]: ["پرس سینه"] },
    food,
    targets: { goal: "cut", kcal: 2000, protein: 120, carbs: 220, fat: 60 },
    ...over,
  }))!;
}

describe("fitWeekText", () => {
  it("بینش‌ها: خوشه‌ی جاافتاده، پروتئین، آخر هفته، عضله، خواب، پایبندی", () => {
    const ids = fitInsights(fullFit()).map((i) => i.id);
    expect(ids).toContain("fit_missed_cluster");
    expect(ids).toContain("fit_skipped_muscle");
    expect(ids).toContain("fit_sleep_missed");
    expect(ids).toContain("fit_adherence_down");
    expect(ids).toContain("fit_weekend_overeat");
    // مرتب بر اساس اهمیت: خوشه‌ی جاافتاده بالاتر از عضله
    expect(ids.indexOf("fit_missed_cluster")).toBeLessThan(ids.indexOf("fit_skipped_muscle"));
  });

  it("بینش پروتئین روزهای تمرین وقتی زیر 85% هدفه", () => {
    const fit = fullFit({
      days: days([{ status: "done", kcal: 2000, protein: 80 }, { status: "rest", kcal: 2000, protein: 125 }, { status: "done", kcal: 2000, protein: 90 }, { status: "rest", kcal: 2000, protein: 130 }]),
    });
    expect(fitInsights(fit).map((i) => i.id)).toContain("fit_protein_training_days");
  });

  it("بردها و جای پیشرفت حداکثر 3 تا و بدون تکرار گروه", () => {
    const { wins, improve } = fitWinsImprove(fullFit());
    expect(wins.length).toBeLessThanOrEqual(3);
    expect(improve.length).toBeGreaterThan(0);
    expect(improve.length).toBeLessThanOrEqual(3);
    expect(improve.join(" ")).toMatch(/جا موند|جا ماند/);
  });

  it("مدال‌ها: همه‌ی جلسه‌ها و تراز بی‌نقص و پروتئین", () => {
    const perfect = computeFitWeek(input({
      days: days(DATES.map((_, i) => ({ status: (i % 2 === 0 ? "done" : "rest") as FitStatus, kcal: 2000, protein: 125 }))),
      sessions: [
        { date: DATES[0], completed: true, items: ["پرس سینه"], startMin: null }, { date: DATES[2], completed: true, items: ["اسکوات"], startMin: null },
        { date: DATES[4], completed: true, items: ["زیربغل"], startMin: null }, { date: DATES[6], completed: true, items: ["ددلیفت رومانیایی"], startMin: null },
      ],
      plannedByDate: { [DATES[0]]: ["پرس سینه"], [DATES[2]]: ["اسکوات"], [DATES[4]]: ["زیربغل"], [DATES[6]]: ["ددلیفت رومانیایی"] },
      targets: { goal: "maintain", kcal: 2000, protein: 120, carbs: null, fat: null },
    }))!;
    const keys = fitMedals(perfect).map((m) => m.key);
    expect(keys).toEqual(expect.arrayContaining(["fit_all_sessions", "fit_all_muscles", "fit_protein_5", "fit_kcal_6", "fit_balance"]));
    expect(fitMedals(fullFit()).map((m) => m.key)).not.toContain("fit_all_sessions");
  });

  it("تیتر بر اساس جلسه‌ها و تغذیه و هفته‌ی جاری با تا الان", () => {
    const h = fitHeadline(fullFit())!;
    expect(h).toContain("3 از 5 جلسه");
    expect(fitHeadline(fullFit(), true)!).toContain("تا الان");
    expect(h).not.toContain("خواب");
  });

  it("مقدمه شامل جلسه‌ها، کالری و پروتئین و بدون اعراب", () => {
    const t = fitIntro(fullFit(), { weekLabel: "28 شهریور تا 3 مهر", score: 72, grade: "B", prevScore: 60 });
    expect(t).toContain("72");
    expect(t).toContain("3 از 5 جلسه");
    expect(t).toContain("پروتئین");
    expect(BAD.test(t)).toBe(false);
    expect(fitIntro(fullFit(), { weekLabel: "x", score: null, grade: null, prevScore: null })).toBe("");
  });

  it("هدف عددی هفته‌ی بعد: جلسه، پروتئین، بازه‌ی کالری", () => {
    const nt = fitNextTargets(fullFit());
    expect(nt).toEqual({ sessions: 5, proteinG: 120, kcalMin: 1800, kcalMax: 2200 });
    const nw = fitNextWeek(fullFit(), { focusDomain: null, focusTitle: "", focusText: "", suggestedTarget: null }, { fitness: 55, nutrition: 80 });
    expect(nw.focusDomain).toBe("fitness");
    expect(nw.focusText).toContain("5 جلسه تمرین");
    expect(nw.focusText).toContain("1800 تا 2200");
    expect(nw.suggestedTarget).toBe(65);
  });

  it("کاشی‌های عددی غیرتکراری و با domain null", () => {
    const n = fitNumbers(fullFit());
    expect(n.map((x) => x.key)).toEqual(expect.arrayContaining(["fit_exercises", "fit_muscles", "fit_protein_days", "fit_balance"]));
    expect(n.every((x) => x.domain === null)).toBe(true);
    expect(n.find((x) => x.key === "fit_balance")!.hint).toMatch(/تخمین/);
  });

  it("خلاصه‌ی AI فقط عدد و کلید است", () => {
    const s = fitAiSummary(fullFit());
    expect(s.training!.sessionsDone).toBe(3);
    expect(s.nutrition!.goal).toBe("cut");
    expect(JSON.stringify(s)).not.toContain("پرس");
  });

  it("همه‌ی خروجی‌های فارسی بدون اعراب و الف همزه‌دار", () => {
    const fit = fullFit();
    const all = [
      ...fitInsights(fit).map((i) => `${i.title} ${i.body}`),
      ...fitWinsImprove(fit).wins, ...fitWinsImprove(fit).improve,
      ...fitMedals(fit).map((m) => `${m.title} ${m.description}`),
      ...fitNumbers(fit).map((n) => `${n.label} ${n.hint ?? ""}`),
      fitHeadline(fit) ?? "",
    ].join(" ");
    expect(BAD.test(all)).toBe(false);
  });

  it("applyFitToLetter: جایگزینی تیتر و ادغام بینش‌ها با سقف 6 و حذف مدال تکراری", () => {
    const fit = fullFit();
    const dayCells = DATES.map((date, i) => ({ date, weekday: NAMES[i], score: 60, isToday: false, isFuture: false, details: {} }));
    const letter = {
      headline: "قدیمی", intro: "قدیمی",
      days: dayCells,
      overall: { score: 72, prevScore: 60, delta: 12, grade: "B", consistency: 70, activeDays: 6, rank: null },
      weekLabel: "x",
      insights: Array.from({ length: 6 }, (_, i) => ({ id: `old${i}`, kind: "streak", icon: "flame", title: "t", body: "b", tone: "good" })),
      wins: ["برد قدیمی"], improve: [],
      achievements: [{ key: "fitness_all_sessions", title: "a", description: "b", emoji: "x", source: "weekly" }, { key: "grade_a", title: "g", description: "d", emoji: "x", source: "weekly" }],
      numbers: [{ key: "sleep_bed", label: "l", value: "23:30", domain: "sleep" }],
      domains: [{ domain: "fitness", score: 55 }, { domain: "nutrition", score: 80 }],
      nextWeek: { focusDomain: null, focusTitle: "", focusText: "", suggestedTarget: null },
    } as unknown as WeeklyLetterData;
    const out = applyFitToLetter(letter, fit);
    expect(out.fit).toBe(fit);
    expect(out.headline).not.toBe("قدیمی");
    expect(out.headline).toContain("3 از 5 جلسه");
    expect(out.insights.length).toBe(6);
    expect(out.insights[0].id.startsWith("fit_")).toBe(true);
    expect(out.achievements.map((a) => a.key)).not.toContain("fitness_all_sessions");
    expect(out.achievements.map((a) => a.key)).toContain("grade_a");
    expect(out.numbers.map((n) => n.key)).toContain("sleep_bed");
    expect(out.nextWeek.focusDomain).toBe("fitness");
  });

  it("applyFitToLetter: هفته‌ی جاری در دو روز اول تیتر پایه رو نگه می‌داره", () => {
    const fit = fullFit();
    const dayCells = DATES.map((date, i) => ({ date, weekday: NAMES[i], score: 60, isToday: i === 1, isFuture: i > 1, details: {} }));
    const letter = {
      headline: "پایه", intro: "پایه-مقدمه", days: dayCells, weekLabel: "x",
      overall: { score: 72, prevScore: null, delta: null, grade: null, consistency: null, activeDays: 2, rank: null },
      insights: [], wins: [], improve: [], achievements: [], numbers: [], domains: [],
      nextWeek: { focusDomain: null, focusTitle: "", focusText: "", suggestedTarget: null },
    } as unknown as WeeklyLetterData;
    const out = applyFitToLetter(letter, fit);
    expect(out.headline).toBe("پایه");
    expect(out.intro).toBe("پایه-مقدمه");
    expect(out.fit).toBe(fit);
  });
});
