import { describe, expect, it } from "vitest";
import {
  bestWorstIndex, dayRows, domainRadarAxes, fmtMoney, groupByJalaliMonth, normalizeLetter, offsetOfWeek, parseCountable, scoreBand,
} from "@/components/WeeklyLetterUtils";
import type { DayCell, LetterSummary } from "@/lib/weeklyAnalysis/types";

describe("offsetOfWeek", () => {
  // 2026-10-03 شنبه است: هفته‌ی جاری از همون روز شروع می‌شه
  const sat = new Date(2026, 9, 3, 10);
  it("هفته‌ی جاری 0", () => expect(offsetOfWeek("2026-10-03", sat)).toBe(0));
  it("هفته‌ی قبل -1", () => expect(offsetOfWeek("2026-09-26", sat)).toBe(-1));
  it("وسط هفته هم درست", () => expect(offsetOfWeek("2026-09-26", new Date(2026, 9, 7))).toBe(-1));
  it("جمعه هنوز هفته‌ی قبله", () => expect(offsetOfWeek("2026-09-26", new Date(2026, 9, 2))).toBe(0));
  it("چند هفته پیش", () => expect(offsetOfWeek("2026-08-22", sat)).toBe(-6));
  it("ورودی نامعتبر امن", () => expect(offsetOfWeek("x", sat)).toBe(-1));
});

describe("groupByJalaliMonth", () => {
  const mk = (weekStart: string): LetterSummary => ({ weekStart, issueNo: 1, weekLabel: "", score: 1, grade: "A", headline: "", archetype: null, read: true, createdAt: "" });
  it("گروه می‌کنه و ترتیب رو نگه می‌داره", () => {
    const g = groupByJalaliMonth([mk("2026-10-03"), mk("2026-09-26"), mk("2026-09-12")]);
    expect(g.map((x) => x.label)).toEqual(["مهر 1405", "شهریور 1405"]);
    expect(g[0].items).toHaveLength(2);
  });
});

describe("dayRows", () => {
  it("همه‌ی کلیدها یک ردیف می‌گیرن", () => {
    const rows = dayRows({
      routine: { done: 4, total: 6 },
      sleep: { hours: 7.2, sleptAt: "23:40", wokeAt: "07:10", quality: 4 },
      fitness: { status: "done" },
      nutrition: { kcal: 2140, target: 2200, protein: 120 },
      trading: { count: 3, wins: 2, losses: 1, net: 45, currency: "USD" },
      tasks: { done: 2, due: 3 },
      learning: { steps: 1 },
    });
    expect(rows.map((r) => r.domain)).toEqual(["routine", "sleep", "fitness", "nutrition", "trading", "tasks", "learning"]);
    expect(rows[0].text).toBe("4 از 6 برنامه انجام شد");
    expect(rows[1].sub).toContain("23:40 تا 07:10");
    expect(rows[4].sub).toContain("+45 $");
  });
  it("داده‌ی خالی ردیف نمی‌سازه", () => expect(dayRows({})).toEqual([]));
  it("خواب بدون ساعت", () => expect(dayRows({ sleep: { hours: null, sleptAt: null, wokeAt: null, quality: null } })[0].text).toBe("خواب ثبت شد"));
});

describe("bestWorstIndex", () => {
  const d = (score: number | null): DayCell => ({ date: "", weekday: "", score, isToday: false, isFuture: false, details: {} });
  it("بهترین و بدترین", () => expect(bestWorstIndex([d(50), d(90), d(null), d(20)])).toEqual({ best: 1, worst: 3 }));
  it("تک روز => فقط بهترین", () => expect(bestWorstIndex([d(50), d(null)])).toEqual({ best: 0, worst: -1 }));
  it("بدون داده", () => expect(bestWorstIndex([d(null)])).toEqual({ best: -1, worst: -1 }));
});

describe("misc", () => {
  it("parseCountable", () => {
    expect(parseCountable("34/40")).toMatchObject({ num: 34, suffix: "/40" });
    expect(parseCountable("7.4")).toMatchObject({ num: 7.4, decimals: 1 });
    expect(parseCountable("+133.5")).toMatchObject({ prefix: "+", num: 133.5 });
    expect(parseCountable("62%")).toMatchObject({ num: 62, suffix: "%" });
    expect(parseCountable("23:40")).toBeNull();
    expect(parseCountable("بدون داده")).toBeNull();
  });
  it("fmtMoney و scoreBand", () => {
    expect(fmtMoney(-32, "USD")).toBe("−32 $");
    expect(scoreBand(85)).toBe("great");
    expect(scoreBand(null)).toBe("none");
  });
  it("normalizeLetter با داده‌ی ناقص نمی‌ترکه", () => {
    const n = normalizeLetter({ weekStart: "2026-09-26" } as never);
    expect(n?.days).toEqual([]);
    expect(n?.ai).toBeNull();
    expect(n?.nextWeek.focusDomain).toBeNull();
    expect(normalizeLetter(null)).toBeNull();
  });
});

describe("domainRadarAxes", () => {
  const dom = (domain: string, score: number | null, prevScore: number | null = null, hasData = true) =>
    ({ domain, active: true, hasData, score, prevScore, delta: null, daysWithData: 3, daily: [], stats: [], note: "", bestDay: null, worstDay: null }) as never;
  it("با سه دامنه‌ی دارای داده محور می‌سازه و prev رو نگه می‌داره", () => {
    const ax = domainRadarAxes([dom("sleep", 70, 60), dom("routine", 50), dom("fitness", 90, 80)]);
    expect(ax.map((a) => a.key)).toEqual(["sleep", "routine", "fitness"]);
    expect(ax[0]).toMatchObject({ label: "خواب", value: 70, prev: 60 });
    expect(ax[1].prev).toBeNull();
  });
  it("دامنه‌ی بی‌داده حذف می‌شه و کمتر از سه تا یعنی رادار نیست", () => {
    expect(domainRadarAxes([dom("sleep", 70), dom("routine", 50), dom("fitness", null, null, false)])).toEqual([]);
  });
});
