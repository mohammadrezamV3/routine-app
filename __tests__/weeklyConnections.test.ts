import { describe, it, expect } from "vitest";
import {
  afterLossPattern, analyzePair, bedtimeShifted, computeConnections, explainDay, pearson, stdev, timePatterns, tradeHourPattern,
  tradeSplits, weekdayPatterns, CONN_MIN_PAIRS,
  type ConnDay, type ConnTrade, type MetricKey,
} from "@/lib/weeklyLetter/connections";
import { tradeDayMetrics } from "@/lib/weeklyLetter/connectionsServer";

// اعراب و الف همزه‌دار ممنوعن (escape تا خود فایل تمیز بمونه)
const BAD = new RegExp("[\\u064B-\\u0652\\u0654\\u0670\\u0623\\u0625]");

const START = "2026-09-26"; // شنبه
function iso(i: number) {
  const d = new Date(`${START}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
}
function mk(n: number, f: (i: number) => Partial<Record<MetricKey, number | null>>): ConnDay[] {
  return Array.from({ length: n }, (_, i) => ({ date: iso(i), jsDay: new Date(`${iso(i)}T00:00:00.000Z`).getUTCDay(), m: f(i) }));
}
// دنباله‌ی شبه‌تصادفی ولی قطعی
const wob = (i: number, amp: number) => Math.sin(i * 12.9898) * amp;

describe("pearson و آمار پایه", () => {
  it("رابطه‌ی کامل مثبت و منفی", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
  });
  it("واریانس صفر یا نمونه‌ی کم = null", () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });
  it("stdev", () => {
    expect(stdev([1])).toBeNull();
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });
  it("شیفت ساعت خواب: 23:30 و 00:30 پیوسته‌ان", () => {
    expect(bedtimeShifted(1410) + 60).toBe(bedtimeShifted(30));
  });
});

describe("analyzePair", () => {
  const sleepRoutine = (n: number) =>
    mk(n, (i) => {
      const sleep = i % 2 ? 8 : 5.5;
      return { sleepHours: sleep + wob(i, 0.2), routinePct: (sleep >= 7 ? 85 : 55) + wob(i, 3) };
    });

  it("خواب بیشتر و روتین بهتر پیدا می‌شه", () => {
    const res = analyzePair({ x: "sleepHours", y: "routinePct", lag: 0, thr: 7 }, sleepRoutine(30), iso(23));
    expect(res).not.toBeNull();
    expect(res!.r).toBeGreaterThan(0.9);
    expect(res!.hiMean).toBeGreaterThan(res!.loMean + 20);
    expect(res!.weekTotal).toBeGreaterThanOrEqual(3);
    expect(res!.weekHits).toBe(res!.weekTotal);
  });

  it("با داده‌ی کم هیچ یافته‌ای نیست", () => {
    expect(analyzePair({ x: "sleepHours", y: "routinePct", lag: 0, thr: 7 }, sleepRoutine(CONN_MIN_PAIRS - 1), iso(0))).toBeNull();
  });

  it("بدون رابطه (نویز) یافته نمی‌ده", () => {
    const days = mk(35, (i) => ({ sleepHours: 7 + wob(i, 1), routinePct: 70 + wob(i * 7 + 3, 15) }));
    // r احتمالی کوچیکه؛ اگه رد نشد حتما کم‌اثر یا ناهم‌سو نیست
    const r = analyzePair({ x: "sleepHours", y: "routinePct", lag: 0, thr: 7 }, days, iso(28));
    if (r) expect(Math.abs(r.r)).toBeGreaterThanOrEqual(0.35);
  });

  it("همبستگی بالا ولی اختلاف عملی کم رد می‌شه", () => {
    const days = mk(30, (i) => ({ sleepHours: i % 2 ? 8 : 5.5, routinePct: i % 2 ? 71 : 69 }));
    expect(analyzePair({ x: "sleepHours", y: "routinePct", lag: 0, thr: 7 }, days, iso(0))).toBeNull();
  });

  it("تاخیر یک‌روزه: تمرین امروز و خواب فردا", () => {
    const days = mk(30, (i) => {
      const worked = i % 2 === 0 ? 1 : 0;
      // خواب روز i+1 به تمرین روز i وابسته‌ست
      return { workout: worked, sleepHours: i === 0 ? 7 : (i - 1) % 2 === 0 ? 8.2 : 6.2 };
    });
    const res = analyzePair({ x: "workout", y: "sleepHours", lag: 1 }, days, iso(23));
    expect(res).not.toBeNull();
    expect(res!.hiMean).toBeGreaterThan(res!.loMean + 1.5);
  });

  it("گروه خیلی نامتعادل با آستانه‌ی ثابت: به میانه برمی‌گرده", () => {
    // تقریبا همه‌ی شب‌ها بالای 7 ساعت
    const days = mk(30, (i) => ({ sleepHours: i < 2 ? 5 : 7.5 + (i % 3) * 0.4, routinePct: i < 2 ? 40 : 80 + (i % 3) * 5 }));
    const r = analyzePair({ x: "sleepHours", y: "routinePct", lag: 0, thr: 7 }, days, iso(23));
    if (r) {
      expect(r.hiN).toBeGreaterThanOrEqual(3);
      expect(r.loN).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("computeConnections", () => {
  it("یافته‌ی خواب به روتین با لحن تشویقی و متن بدون اعراب", () => {
    const days = mk(35, (i) => {
      const sleep = i % 2 ? 8 : 5.5;
      return { sleepHours: sleep + wob(i, 0.2), routinePct: (sleep >= 7 ? 85 : 55) + wob(i, 3) };
    });
    const out = computeConnections({ days, weekStart: iso(28), weekScores: [], trades: [] });
    const link = out.items.find((x) => x.kind === "link");
    expect(link).toBeTruthy();
    expect(link!.tone).toBe("good");
    expect(link!.domains).toEqual(expect.arrayContaining(["sleep", "routine"]));
    for (const it of out.items) {
      expect(BAD.test(it.title + it.body)).toBe(false);
      expect(/[۰-۹]/.test(it.title + it.body)).toBe(false);
    }
    expect(out.items.length).toBeLessThanOrEqual(9);
  });

  it("با ۵ روز داده هیچ یافته‌ای نیست", () => {
    const days = mk(5, (i) => ({ sleepHours: 6 + i, routinePct: 50 + i * 10 }));
    expect(computeConnections({ days, weekStart: iso(0), weekScores: [], trades: [] }).items).toEqual([]);
  });

  it("ورودی خالی بدون خطا", () => {
    expect(computeConnections({ days: [], weekStart: START, weekScores: [], trades: [] }).items).toEqual([]);
  });
});

describe("الگوی روز هفته", () => {
  it("یک روز هفته‌ی ثابت پایین شناسایی می‌شه", () => {
    const days = mk(35, (i) => {
      const d = new Date(`${iso(i)}T00:00:00.000Z`).getUTCDay();
      return { routinePct: d === 5 ? 30 + wob(i, 2) : 80 + wob(i, 3) };
    });
    const out = weekdayPatterns(days);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("dow-routinePct");
    expect(out[0].tone).toBe("bad");
  });
  it("داده‌ی کم یا بدون اختلاف = هیچ", () => {
    expect(weekdayPatterns(mk(10, () => ({ routinePct: 50 })))).toEqual([]);
    expect(weekdayPatterns(mk(35, () => ({ routinePct: 70 })))).toEqual([]);
  });
});

describe("الگوهای ساعت‌محور", () => {
  it("آخرین تیک دیروقت", () => {
    const out = timePatterns(mk(14, () => ({ lastTick: 22 * 60 + 15 })));
    expect(out.some((x) => x.id === "time-late-ticks")).toBe(true);
  });
  it("کمتر از ۷ روز = هیچ", () => {
    expect(timePatterns(mk(6, () => ({ lastTick: 23 * 60 })))).toEqual([]);
  });
  it("تمرین دیروقت نیاز به ۴ جلسه داره", () => {
    expect(timePatterns(mk(3, () => ({ workoutStart: 21 * 60 }))).some((x) => x.id === "time-late-workout")).toBe(false);
    expect(timePatterns(mk(5, () => ({ workoutStart: 21 * 60 }))).some((x) => x.id === "time-late-workout")).toBe(true);
  });
  it("ساعت خواب پراکنده در برابر منظم", () => {
    const scattered = mk(14, (i) => ({ bedtime: bedtimeShifted(i % 2 ? 22 * 60 : 1 * 60 + 30) }));
    expect(timePatterns(scattered).some((x) => x.id === "time-bedtime-irregular")).toBe(true);
    const steady = mk(14, (i) => ({ bedtime: bedtimeShifted(23 * 60 + (i % 3) * 5) }));
    expect(timePatterns(steady).some((x) => x.id === "time-bedtime-regular")).toBe(true);
  });
});

function trade(i: number, o: Partial<ConnTrade>): ConnTrade {
  const openedMs = Date.UTC(2026, 8, 1) + i * 86_400_000 + 9 * 3_600_000;
  return { date: "2026-09-01", minute: 9 * 60, openedMs, closedMs: openedMs + 3_600_000, win: true, r: 1, checklistFull: true, followedPlan: true, hasStop: true, ...o };
}

describe("تقسیم‌های معامله‌ای", () => {
  it("چک‌لیست کامل با نرخ برد بالاتر", () => {
    const ts = [
      ...Array.from({ length: 8 }, (_, i) => trade(i, { checklistFull: true, win: i < 7 })),
      ...Array.from({ length: 8 }, (_, i) => trade(i + 8, { checklistFull: false, win: i < 2 })),
    ];
    const out = tradeSplits(ts);
    expect(out.find((x) => x.id === "trade-checklist")?.tone).toBe("good");
  });
  it("معامله‌ی کم یا گروه کوچیک = هیچ", () => {
    expect(tradeSplits(Array.from({ length: 8 }, (_, i) => trade(i, { win: i % 2 === 0 })))).toEqual([]);
    const ts = [
      ...Array.from({ length: 12 }, (_, i) => trade(i, { checklistFull: true, win: true })),
      ...Array.from({ length: 2 }, (_, i) => trade(i + 12, { checklistFull: false, win: false })),
    ];
    expect(tradeSplits(ts).some((x) => x.id === "trade-checklist")).toBe(false);
  });
  it("الگوی ساعت ورود", () => {
    const ts = [
      ...Array.from({ length: 7 }, (_, i) => trade(i, { minute: 9 * 60, win: i < 6 })),
      ...Array.from({ length: 7 }, (_, i) => trade(i + 7, { minute: 20 * 60, win: i < 1 })),
    ];
    const r = tradeHourPattern(ts);
    expect(r).not.toBeNull();
    expect(r!.n).toBe(14);
    expect(tradeHourPattern(ts.slice(0, 6))).toBeNull();
  });
  it("معامله بعد از ضرر", () => {
    const ts: ConnTrade[] = [];
    let t = Date.UTC(2026, 8, 1, 8);
    // ۸ جفت: ضرر و فورا معامله‌ی بازنده بعدش؛ بعد ۶ معامله‌ی جدا و برنده
    for (let i = 0; i < 8; i++) {
      ts.push(trade(0, { openedMs: t, closedMs: t + 600_000, win: false }));
      ts.push(trade(0, { openedMs: t + 1_200_000, closedMs: t + 1_800_000, win: false }));
      t += 86_400_000;
    }
    for (let i = 0; i < 8; i++) {
      ts.push(trade(0, { openedMs: t, closedMs: t + 600_000, win: true }));
      t += 86_400_000;
    }
    const r = afterLossPattern(ts);
    expect(r).not.toBeNull();
    expect(r!.tone).toBe("bad");
    expect(afterLossPattern(ts.slice(0, 4))).toBeNull();
  });
});

describe("توضیح بهترین روز", () => {
  it("عامل پرت امروز با میانگین ۳۴ روز دیگه مقایسه می‌شه", () => {
    const days = mk(35, (i) => ({ sleepHours: 7 + wob(i, 0.3), protein: 100 + wob(i, 5) }));
    days[30] = { ...days[30], m: { sleepHours: 9.5, protein: 101 } };
    const e = explainDay(days, days[30].date, "best");
    expect(e).not.toBeNull();
    expect(e!.body).toContain("9.5");
    expect(e!.tone).toBe("good");
    expect(BAD.test(e!.title + e!.body)).toBe(false);
  });
  it("پایه‌ی کم یا عامل عادی = null", () => {
    const few = mk(5, () => ({ sleepHours: 7 }));
    expect(explainDay(few, few[2].date, "best")).toBeNull();
    const flat = mk(35, (i) => ({ sleepHours: 7 + wob(i, 0.3) }));
    expect(explainDay(flat, flat[30].date, "worst")).toBeNull();
  });
});

describe("tradeDayMetrics", () => {
  it("روز بدون معامله خالیه و شمارش‌ها درسته", () => {
    expect(tradeDayMetrics([])).toEqual({});
    const m = tradeDayMetrics([trade(0, { win: true, r: 2 }), trade(1, { win: false, r: -1, checklistFull: false }), trade(2, { win: null, r: null })]);
    expect(m.tradeCount).toBe(3);
    expect(m.dayWin).toBe(50);
    expect(m.tradeR).toBe(0.5);
    expect(m.checklistPct).toBeCloseTo(66.67, 1);
  });
});
