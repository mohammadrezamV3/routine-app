import { describe, it, expect } from "vitest";
import { detectArchetype, type ArchetypeInput } from "@/lib/weeklyAnalysis/archetype";
import { buildHeadline } from "@/lib/weeklyAnalysis/headline";
import { weekFacts, avgBedtime, type FactDay } from "@/lib/weeklyAnalysis/facts";
import { buildNumbers } from "@/lib/weeklyAnalysis/numbers";
import { daysOfWeekIso } from "@/lib/weeklyAnalysis/week";
import { sleepWeeks, fitnessWeeks, nutritionWeeks, tradingWeeks, tasksWeeks, hhmm, type TradeRow } from "@/lib/weeklyAnalysis/domains";
import type { DayCell, DomainResult } from "@/lib/weeklyAnalysis/types";
import { buildIntro, buildNextWeek, buildWinsAndImprove, domainBestWorst, domainNote, factsOfDays, suggestTarget } from "@/lib/weeklyLetter/text";
import { greetingNameOf, rankAmongTrend } from "@/lib/weeklyLetter/build";
import { letterDue } from "@/lib/weeklyLetter/dispatch";
import { rowToSummary, summaryOf } from "@/lib/weeklyLetter/summary";
import { normalizePrefs } from "@/lib/weeklyLetter/prefs";

// هفته‌نامه و بخش‌های تازه‌ی موتور آنالیز — فقط توابع خالص.

// اعراب و الف همزه‌دار ممنوعن (با escape نوشته شده تا خود فایل هم تمیز بمونه)
const BAD = new RegExp("[\\u064B-\\u0652\\u0654\\u0670\\u0623\\u0625]");
const NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function cell(i: number, score: number | null, details: DayCell["details"] = {}, extra: Partial<DayCell> = {}): DayCell {
  return { date: `2026-09-${String(19 + i).padStart(2, "0")}`, weekday: NAMES[i], score, isToday: false, isFuture: false, details, ...extra };
}

function domain(d: DomainResult["domain"], score: number | null, daily: (number | null)[], over: Partial<DomainResult> = {}): DomainResult {
  return { domain: d, active: true, hasData: score != null, score, prevScore: null, delta: null, daysWithData: daily.filter((x) => x != null).length, daily, stats: [], ...over };
}

const archBase: ArchetypeInput = {
  isCurrentWeek: false,
  daysElapsed: 7,
  score: 70,
  prevScore: 66,
  consistency: 70,
  activeDays: 6,
  dayScores: [70, 72, 68, 71, 69, 73, 67],
  dayNames: NAMES,
  domains: [],
};

describe("archetype", () => {
  it("بی‌داده یا هفته‌ی جاری خیلی زود = null", () => {
    expect(detectArchetype({ ...archBase, score: null })).toBeNull();
    expect(detectArchetype({ ...archBase, isCurrentWeek: true, daysElapsed: 2 })).toBeNull();
    expect(detectArchetype({ ...archBase, activeDays: 2, dayScores: [70, 70, null, null, null, null, null], isCurrentWeek: true, daysElapsed: 3 })).toBeNull();
  });

  it("quiet: دو روز یا کمتر در هفته‌ی تموم‌شده؛ بالاتر از perfect", () => {
    const a = detectArchetype({ ...archBase, score: 95, activeDays: 2, dayScores: [95, 95, null, null, null, null, null] })!;
    expect(a.key).toBe("quiet");
    expect(a.description).toContain("2 روز");
  });

  it("perfect فقط با امتیاز 90+ و حداقل 4 روز فعال", () => {
    const a = detectArchetype({ ...archBase, score: 93, dayScores: [95, 92, 90, 96, 91, 94, 85] })!;
    expect(a.key).toBe("perfect");
    expect(a.tone).toBe("good");
    expect(a.description).toContain("93");
    expect(a.description).toContain("7 روز");
  });

  it("comeback و fast_start از اختلاف نیمه‌ها", () => {
    const up = detectArchetype({ ...archBase, score: 62, dayScores: [40, 45, 50, 70, 80, 85, 80] })!;
    expect(up.key).toBe("comeback");
    const down = detectArchetype({ ...archBase, score: 62, dayScores: [85, 80, 80, 60, 45, 40, 30] })!;
    expect(down.key).toBe("fast_start");
    expect(down.description).toMatch(/\d+ امتیاز افت/);
  });

  it("rollercoaster، rising، steady، balanced، building", () => {
    expect(detectArchetype({ ...archBase, consistency: 30, dayScores: [95, 20, 90, 25, 85, 30, 90] })!.key).toBe("rollercoaster");
    const rising = detectArchetype({ ...archBase, score: 76, prevScore: 60, consistency: 70, dayScores: [75, 78, 74, 76, 77, 76, 76] })!;
    expect(rising.key).toBe("rising");
    expect(rising.description).toContain("60");
    expect(rising.description).toContain("16");
    expect(detectArchetype({ ...archBase, score: 72, prevScore: 70, consistency: 90 })!.key).toBe("steady");
    expect(
      detectArchetype({
        ...archBase, score: 60, prevScore: 58, consistency: 70,
        domains: [{ domain: "routine", score: 60 }, { domain: "sleep", score: 66 }, { domain: "tasks", score: 70 }, { domain: "fitness", score: 20 }],
      })!.key
    ).toBe("balanced");
    const b = detectArchetype({ ...archBase, score: 55, prevScore: 54, consistency: 70, dayScores: [55, 58, 52, 55, 57, 54, 54] })!;
    expect(b.key).toBe("building");
    expect(b.description).toContain("قوی‌ترین روزت");
  });

  it("متن‌ها اعراب و الف همزه‌دار ندارن", () => {
    const all = [
      detectArchetype({ ...archBase, score: 93, dayScores: [95, 92, 90, 96, 91, 94, 85] }),
      detectArchetype({ ...archBase, score: 62, dayScores: [40, 45, 50, 70, 80, 85, 80] }),
      detectArchetype({ ...archBase, consistency: 30, dayScores: [95, 20, 90, 25, 85, 30, 90] }),
    ];
    for (const a of all) expect(`${a!.title} ${a!.description}`).not.toMatch(BAD);
  });
});

describe("headline", () => {
  const base = { isCurrentWeek: false, daysElapsed: 7, score: 78, prevScore: 70, activeDays: 7, dayScores: [80, 75, 72, 71, 65, 90, 85] as (number | null)[], domains: [] as { domain: any; delta: number | null }[] };

  it("روزهای بالای 70 + تغییر خواب، با عدد واقعی", () => {
    const h = buildHeadline({ ...base, sleepHours: { cur: 7.4, prev: 6.8 } });
    expect(h).toBe("6 روز از 7 روز بالای 70 بودی و خوابت 0.6 ساعت بیشتر شد");
  });

  it("کاهش خواب = ولی؛ جهت‌ها درست", () => {
    const h = buildHeadline({ ...base, sleepHours: { cur: 6.1, prev: 7.0 } });
    expect(h).toBe("6 روز از 7 روز بالای 70 بودی ولی خوابت 0.9 ساعت کمتر شد");
  });

  it("بدون خواب: بزرگ‌ترین تغییر دامنه، بعد تغییر کل", () => {
    expect(buildHeadline({ ...base, domains: [{ domain: "routine", delta: 14 }, { domain: "tasks", delta: -3 }] })).toContain("امتیاز روتین 14 واحد بالا رفت");
    expect(buildHeadline({ ...base, prevScore: 60 })).toContain("امتیاز کلت 18 واحد بیشتر از هفته‌ی قبل شد");
  });

  it("هفته‌ی جاری «تا الان» می‌گیره و روزهای گذشته رو می‌شمره", () => {
    const h = buildHeadline({ ...base, isCurrentWeek: true, daysElapsed: 3, dayScores: [80, 75, 72, null, null, null, null], activeDays: 3 });
    expect(h.startsWith("تا الان هر 3 روز بالای 70 بودی")).toBe(true);
  });

  it("داده‌ی کم = کم‌گویی", () => {
    expect(buildHeadline({ ...base, score: null, activeDays: 0 })).toContain("ثبت نشده");
    expect(buildHeadline({ ...base, activeDays: 1, dayScores: [60, null, null, null, null, null, null] })).toBe("این هفته فقط 1 روز ثبت داشتی");
    expect(buildHeadline({ ...base, isCurrentWeek: true, daysElapsed: 2, activeDays: 2, dayScores: [60, 70, null, null, null, null, null] })).toContain("تازه شروع شده");
    // کمتر از 3 روز دارای امتیاز: جمله‌ی «روز بالای 70» نمی‌ره
    const h = buildHeadline({ ...base, dayScores: [60, 70, null, null, null, null, null], activeDays: 2 });
    expect(h).not.toContain("روز از");
    expect(h).toContain("78");
  });

  it("هیچ روزی به 70 نرسید", () => {
    expect(buildHeadline({ ...base, score: 50, dayScores: [50, 55, 45, 52, 48, 40, 60] })).toContain("هیچ روزی به 70 نرسیدی");
  });
});

describe("facts و numbers", () => {
  const day = (details: FactDay["details"], closed = true): FactDay => ({ details, closed });

  it("میانگین ساعت خواب: بعد از نیمه‌شب به شب قبل می‌چسبه", () => {
    expect(avgBedtime(["23:30", "00:30"])).toBe("00:00");
    expect(avgBedtime(["23:00", "23:20"])).toBe("23:10");
    expect(avgBedtime([])).toBeNull();
  });

  it("جمع‌بندی همه‌ی دامنه‌ها از details", () => {
    const f = weekFacts([
      day({
        routine: { done: 4, total: 4 },
        sleep: { hours: 7.5, sleptAt: "23:30", wokeAt: "07:00", quality: 4 },
        fitness: { status: "done" },
        nutrition: { kcal: 2100, target: 2000, protein: 120 },
        trading: { count: 2, wins: 1, losses: 1, net: 30, currency: "USD" },
        tasks: { done: 2, due: 3 },
      }),
      day({
        routine: { done: 2, total: 4 },
        sleep: { hours: 6.5, sleptAt: "00:30", wokeAt: "07:00", quality: null },
        fitness: { status: "missed" },
        nutrition: { kcal: 2900, target: 2000, protein: null },
        trading: { count: 1, wins: 0, losses: 1, net: -10, currency: "USD" },
        tasks: { done: 1, due: 1 },
      }),
      day({ routine: { done: 0, total: 4 } }, false), // امروز، بی‌تیک: شمرده نمی‌شه
      day({ fitness: { status: "rest" } }),
    ]);
    expect(f.routine).toEqual({ done: 6, total: 8, perfectDays: 1, days: 2 });
    expect(f.sleep).toMatchObject({ nights: 2, avgHours: 7, avgBed: "00:00", avgWake: "07:00", avgQuality: 4, nights7h: 1 });
    expect(f.fitness).toMatchObject({ done: 1, missed: 1, rest: 1, planned: 2 });
    expect(f.nutrition).toMatchObject({ avgKcal: 2500, target: 2000, onTargetDays: 1, targetDays: 2, avgProtein: 120 });
    expect(f.trading).toMatchObject({ count: 3, wins: 1, losses: 2, net: 20, currency: "USD" });
    expect(f.tasks).toEqual({ days: 2, done: 3, due: 4, overdue: 1 });
  });

  it("numbers: فقط دامنه‌های دارای داده، hint با هفته‌ی قبل، سقف 12", () => {
    const cur = weekFacts([
      day({ routine: { done: 5, total: 6 }, sleep: { hours: 7.4, sleptAt: "23:40", wokeAt: "07:10", quality: null } }),
      day({ routine: { done: 6, total: 6 }, sleep: { hours: 7.4, sleptAt: "23:40", wokeAt: "07:10", quality: null } }),
      day({ routine: { done: 3, total: 6 } }),
    ]);
    const prev = weekFacts([day({ routine: { done: 4, total: 6 }, sleep: { hours: 6.8, sleptAt: "00:10", wokeAt: "07:10", quality: null } })]);
    const nums = buildNumbers({ cur, prev, activeDays: 3, prevActiveDays: 5, learning: null });
    const by = Object.fromEntries(nums.map((n) => [n.key, n]));
    expect(by.routine_done.value).toBe("14/18");
    expect(by.sleep_avg.value).toBe("7.4");
    expect(by.sleep_avg.hint).toBe("0.6 ساعت بیشتر از هفته‌ی قبل");
    expect(by.active_days.hint).toBe("2 روز کمتر از هفته‌ی قبل");
    expect(by.trade_count).toBeUndefined();
    expect(by.nutrition_kcal).toBeUndefined();
    expect(nums.length).toBeLessThanOrEqual(12);
    for (const n of nums) expect(`${n.label}${n.value}${n.hint ?? ""}`).not.toMatch(BAD);
  });

  it("numbers بدون هیچ داده فقط روزهای فعال رو داره", () => {
    const empty = weekFacts([]);
    const nums = buildNumbers({ cur: empty, prev: null, activeDays: 0, prevActiveDays: null, learning: null });
    expect(nums.map((n) => n.key)).toEqual(["active_days"]);
  });
});

describe("جزئیات روزانه‌ی دامنه‌ها", () => {
  const env = { timezone: "UTC", todayIso: "2026-09-22" };
  const weeks = [{ weekStartIso: "2026-09-19", days: daysOfWeekIso("2026-09-19") }];

  it("hhmm", () => {
    expect(hhmm(7 * 60 + 5)).toBe("07:05");
    expect(hhmm(-30)).toBe("23:30");
  });

  it("خواب: مدت و ساعت‌ها به وقت محلی", () => {
    const [w] = sleepWeeks(
      [{ date: new Date("2026-09-20T00:00:00Z"), sleptAt: new Date("2026-09-19T20:00:00Z"), wokeAt: new Date("2026-09-20T03:30:00Z"), targetSleptAt: null, targetWokeAt: null, quality: 4 }],
      weeks,
      { timezone: "Asia/Tehran", todayIso: "2026-09-22" }
    );
    expect(w.details[1].sleep).toEqual({ hours: 7.5, sleptAt: "23:30", wokeAt: "07:00", quality: 4 });
    expect(w.details[0].sleep).toBeUndefined();
  });

  it("تمرین: done / extra / partial / missed / rest", () => {
    const plan = { startDate: new Date("2026-09-01T00:00:00Z"), updatedAt: new Date("2026-09-01T00:00:00Z"), isActive: true, gymDays: ["شنبه", "یکشنبه", "دوشنبه"] };
    const [w] = fitnessWeeks(
      {
        plans: [plan],
        logs: [
          { date: new Date("2026-09-19T00:00:00Z"), completed: true, completedItems: [] }, // شنبه برنامه‌ای، انجام
          { date: new Date("2026-09-20T00:00:00Z"), completed: false, completedItems: ["a"] }, // نیمه‌کاره
        ],
      },
      weeks,
      { timezone: "UTC", todayIso: "2026-09-24" }
    );
    expect(w.details.map((d) => d.fitness?.status)).toEqual(["done", "partial", "missed", "rest", "rest", undefined, undefined]);
    const [e] = fitnessWeeks(
      { plans: [plan], logs: [{ date: new Date("2026-09-22T00:00:00Z"), completed: true, completedItems: [] }] },
      weeks,
      { timezone: "UTC", todayIso: "2026-09-24" }
    );
    expect(e.details[3].fitness?.status).toBe("extra");
  });

  it("تغذیه: کالری و هدف و پروتئین هر روز", () => {
    const [w] = nutritionWeeks(
      {
        logs: [
          { date: new Date("2026-09-19T00:00:00Z"), grams: 100, customCalories: 2100, proteinG: 90, foodItem: null },
          { date: new Date("2026-09-19T00:00:00Z"), grams: 100, customCalories: 100, proteinG: null, foodItem: null },
        ],
        targets: [{ effectiveFrom: new Date("2026-09-01T00:00:00Z"), dailyTargetKcal: 2000 }],
      },
      weeks,
      env
    );
    expect(w.details[0].nutrition).toEqual({ kcal: 2200, target: 2000, protein: 90 });
  });

  it("ترید و کارها", () => {
    const t = (over: Partial<TradeRow>): TradeRow => ({
      openedAt: new Date("2026-09-19T10:00:00Z"), status: "CLOSED", result: "PROFIT", pnl: 45, symbol: "EURUSD",
      checklistDone: 5, checklistTotal: 5, followedPlan: true, stopLoss: 1, entryReasons: [], exitReasons: [], emotionBefore: "CALM", account: { currency: "USD" }, ...over,
    });
    const [tw] = tradingWeeks([t({}), t({ result: "LOSS", pnl: -15 }), t({ status: "CANCELED" })], weeks, env);
    expect(tw.details[0].trading).toEqual({ count: 2, wins: 1, losses: 1, net: 30, currency: "USD" });
    const [kw] = tasksWeeks(
      [
        { dueDate: new Date("2026-09-19T10:00:00Z"), completedAt: new Date("2026-09-19T12:00:00Z") },
        { dueDate: new Date("2026-09-19T10:00:00Z"), completedAt: null },
      ],
      weeks,
      env
    );
    expect(kw.details[0].tasks).toEqual({ done: 1, due: 2 });
  });
});

describe("متن هفته‌نامه", () => {
  const days: DayCell[] = [
    cell(0, 82, { routine: { done: 5, total: 6 }, sleep: { hours: 7.5, sleptAt: "23:30", wokeAt: "07:00", quality: 4 }, fitness: { status: "done" }, tasks: { done: 3, due: 3 } }),
    cell(1, 74, { routine: { done: 4, total: 6 }, sleep: { hours: 7.1, sleptAt: "23:50", wokeAt: "07:00", quality: null }, fitness: { status: "rest" } }),
    cell(2, 90, { routine: { done: 6, total: 6 }, sleep: { hours: 8, sleptAt: "23:00", wokeAt: "07:00", quality: 5 }, fitness: { status: "done" }, tasks: { done: 2, due: 2 } }),
    cell(3, 60, { routine: { done: 3, total: 6 }, sleep: { hours: 6.9, sleptAt: "00:10", wokeAt: "07:10", quality: 3 }, tasks: { done: 1, due: 1 } }),
    cell(4, 78, { routine: { done: 5, total: 6 }, fitness: { status: "missed" } }),
    cell(5, 70, { routine: { done: 4, total: 6 } }),
    cell(6, 55, { routine: { done: 3, total: 6 } }),
  ];
  const routine = domain("routine", 75, [83, 67, 100, 50, 83, 67, 50], { delta: 8, prevScore: 67 });
  const sleep = domain("sleep", 88, [95, 90, 100, 70, null, null, null], { delta: -2, prevScore: 90 });
  const fitness = domain("fitness", 60, [100, null, 100, null, 0, null, null], { delta: -12, prevScore: 72 });
  const tasks = domain("tasks", 90, [100, null, 100, 100, null, null, null]);

  it("domainBestWorst", () => {
    expect(domainBestWorst(routine, days)).toEqual({ best: "دوشنبه", worst: "سه‌شنبه" });
    expect(domainBestWorst(domain("sleep", 80, [80, 80, null, null, null, null, null]), days)).toEqual({ best: null, worst: null });
    expect(domainBestWorst(domain("sleep", 80, [80, null, null, null, null, null, null]), days)).toEqual({ best: null, worst: null });
  });

  it("domainNote با عدد واقعی و بدون ادعای اضافه", () => {
    const f = factsOfDays(days);
    const rn = domainNote(routine, f);
    expect(rn).toContain("30 برنامه از 42 برنامه");
    expect(rn).toContain("71%");
    expect(rn).toContain("1 روز همه‌ی برنامه‌ها کامل");
    expect(rn).toContain("8 امتیاز بهتر");
    const sn = domainNote(sleep, f);
    expect(sn).toContain("میانگین خوابت 7.4 ساعت");
    expect(sn).toContain("تقریبا هم‌سطح هفته‌ی قبل");
    expect(domainNote(fitness, f)).toContain("2 از 3 جلسه‌ی برنامه رو تمرین کردی");
    expect(domainNote(fitness, f)).toContain("1 جلسه جا افتاد");
    expect(domainNote(tasks, f)).toContain("6 کار از 6 کار");
    expect(domainNote(tasks, f)).toContain("هیچ کاری عقب نیفتاد");
    expect(domainNote(domain("trading", null, []), f)).toContain("داده‌ای ثبت نشده");
    // دامنه‌ای که details نداره ولی امتیاز داره: جمله‌ی عمومی با همون امتیاز
    expect(domainNote(domain("nutrition", 77, [77, null, null, null, null, null, null]), f)).toContain("77");
  });

  it("بردها و جای پیشرفت: حداکثر 3، یکتا در هر گروه و با عدد", () => {
    const { wins, improve } = buildWinsAndImprove({ score: 72, prevScore: 60, delta: 12, activeDays: 7, days, domains: [routine, sleep, fitness, tasks] });
    expect(wins.length).toBeGreaterThan(0);
    expect(wins.length).toBeLessThanOrEqual(3);
    expect(improve.length).toBeLessThanOrEqual(3);
    expect(wins.join(" ")).toMatch(/\d/);
    expect(improve.join(" ")).toContain("1 جلسه");
    expect(wins.join("\n") + improve.join("\n")).not.toMatch(BAD);
  });

  it("با داده‌ی خیلی کم ادعای بزرگ نمی‌کنه", () => {
    const { wins, improve } = buildWinsAndImprove({ score: 60, prevScore: null, delta: null, activeDays: 1, days: [cell(0, 60, { routine: { done: 3, total: 5 } })], domains: [domain("routine", 60, [60, null, null, null, null, null, null])] });
    expect(wins).toEqual([]);
    expect(improve.every((x) => !x.includes("ثبات"))).toBe(true);
  });

  it("intro: دو تا سه جمله با عدد و بدون اعراب", () => {
    const intro = buildIntro({
      weekLabel: "19 تا 25 شهریور", score: 72, grade: "B", prevScore: 60, activeDays: 7,
      bestDay: days[2], domains: [routine, sleep, fitness, tasks], rank: { position: 1, of: 8 }, archetype: null,
    });
    expect(intro).toContain("72 از 100");
    expect(intro).toContain("نمره‌ی B");
    expect(intro).toContain("12 امتیاز بالاتر از هفته‌ی قبل");
    expect(intro).toContain("دوشنبه");
    expect(intro).toContain("بهترین هفته‌ی 8 هفته‌ی اخیرت");
    expect(intro).not.toMatch(BAD);
    const thin = buildIntro({ weekLabel: "x", score: 40, grade: "D", prevScore: null, activeDays: 2, bestDay: null, domains: [], rank: null, archetype: null });
    expect(thin).toContain("فقط 2 روز");
  });

  it("هدف پیشنهادی و تمرکز هفته‌ی بعد", () => {
    expect(suggestTarget(60)).toBe(70);
    expect(suggestTarget(63)).toBe(75);
    expect(suggestTarget(97)).toBe(100);
    expect(suggestTarget(0)).toBe(40);
    const nw = buildNextWeek({ score: 72, domains: [routine, sleep, fitness, tasks], days });
    expect(nw.focusDomain).toBe("fitness");
    expect(nw.focusTitle).toBe("تمرکز هفته‌ی بعد: بدنسازی");
    expect(nw.suggestedTarget).toBe(70);
    expect(nw.focusText).toContain("1 جلسه");
    const none = buildNextWeek({ score: null, domains: [], days });
    expect(none.focusDomain).toBeNull();
    expect(none.suggestedTarget).toBeNull();
    const strong = buildNextWeek({ score: 92, domains: [domain("sleep", 92, [92, 92, 92, null, null, null, null]), domain("tasks", 96, [96, 96, null, null, null, null, null])], days });
    expect(strong.focusText).toContain("نگه داری");
  });

  it("یادگیری فقط وقتی تنها داده‌ی موجوده تمرکز می‌شه", () => {
    const learning = domain("learning", 20, [null, null, null, null, null, null, null], { daysWithData: 3 });
    expect(buildNextWeek({ score: 70, domains: [learning, sleep], days }).focusDomain).toBe("sleep");
    expect(buildNextWeek({ score: 70, domains: [learning], days }).focusDomain).toBe("learning");
  });
});

describe("ساخت هفته‌نامه — بخش‌های خالص", () => {
  it("رتبه بین هفته‌های ترند", () => {
    const t = (scores: (number | null)[]) => scores.map((s, i) => ({ weekStart: `w${i}`, score: s, domains: {} }));
    expect(rankAmongTrend(t([50, 60, null, 70, 65, 80]))).toEqual({ position: 1, of: 5 });
    expect(rankAmongTrend(t([50, 60, null, 70, 65, 55]))).toEqual({ position: 4, of: 5 });
    expect(rankAmongTrend(t([50, 60]))).toBeNull();
    expect(rankAmongTrend(t([50, 60, 70, null]))).toBeNull();
  });

  it("اسم کوچک برای سلام", () => {
    expect(greetingNameOf("علی رضایی")).toBe("علی");
    expect(greetingNameOf("  سارا ")).toBe("سارا");
    expect(greetingNameOf("a@b.com")).toBeNull();
    expect(greetingNameOf("09121234567")).toBeNull();
    expect(greetingNameOf(null)).toBeNull();
  });

  it("خلاصه‌ی ذخیره‌شده و تبدیل ردیف به LetterSummary", () => {
    const data: any = { weekLabel: "19 تا 25 شهریور", overall: { score: 71, grade: "B" }, headline: "تیتر", archetype: null };
    const sum = summaryOf(data);
    const row = { weekStart: new Date("2026-09-19T00:00:00Z"), issueNo: 4, summary: sum, readAt: null, createdAt: new Date("2026-09-26T05:00:00Z") };
    expect(rowToSummary(row)).toMatchObject({ weekStart: "2026-09-19", issueNo: 4, score: 71, grade: "B", headline: "تیتر", read: false });
    expect(rowToSummary({ ...row, summary: null }, data)?.headline).toBe("تیتر");
    expect(rowToSummary({ ...row, summary: null })).toBeNull();
  });

  it("ترجیح ایمیل پیش‌فرض روشنه", () => {
    expect(normalizePrefs(undefined)).toEqual({ email: true });
    expect(normalizePrefs({ email: false })).toEqual({ email: false });
    expect(normalizePrefs({ email: "x" })).toEqual({ email: true });
  });
});

describe("زمان رسیدن شماره", () => {
  it("شنبه قبل از 8 صبح محلی نه، بعدش بله؛ روزهای بعد جبرانیه", () => {
    // 2026-10-03 شنبه است. تهران = UTC+3:30 (در مهر 1405 هنوز ثابت)، 08:00 تهران = 04:30Z
    const before = letterDue("Asia/Tehran", new Date("2026-10-03T04:00:00Z"));
    expect(before.due).toBe(false);
    expect(before.weekStartIso).toBe("2026-09-26");
    expect(letterDue("Asia/Tehran", new Date("2026-10-03T05:00:00Z")).due).toBe(true);
    const later = letterDue("Asia/Tehran", new Date("2026-10-07T09:00:00Z"));
    expect(later).toEqual({ due: true, weekStartIso: "2026-09-26" });
  });

  it("به منطقه‌ی زمانی کاربر بستگی داره", () => {
    const now = new Date("2026-10-03T04:00:00Z"); // 04:00Z: تهران 07:30، لس‌آنجلس هنوز جمعه شب
    expect(letterDue("Asia/Tehran", now).due).toBe(false);
    const la = letterDue("America/Los_Angeles", now);
    expect(la.due).toBe(true);
    expect(la.weekStartIso).toBe("2026-09-19"); // هنوز در هفته‌ی منتهی به جمعه‌ی 2 اکتبر، پس هفته‌ی قبلی‌ش
  });
});
