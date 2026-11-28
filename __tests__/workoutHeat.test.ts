import { describe, expect, it } from "vitest";
import { buildPctHeat, calorieDayPct, exerciseDayPct, heatDays, heatDaysToMap } from "@/lib/workoutHeat";
import { heatLevel, streakFromHeatmap } from "@/lib/dashboardCompute";

const base = { isGymDay: true, isRest: false, hasPlan: true, beforePlan: false, completed: false, doneItems: 0, plannedItems: 5 };

describe("exerciseDayPct", () => {
  it("بدون پلن یا قبل از شروع = null", () => {
    expect(exerciseDayPct({ ...base, hasPlan: false })).toBeNull();
    expect(exerciseDayPct({ ...base, beforePlan: true })).toBeNull();
  });
  it("روز استراحت خودکار کامل", () => {
    expect(exerciseDayPct({ ...base, isGymDay: false, isRest: true })).toBe(100);
  });
  it("روز باشگاه: پایان تمرین کامل، ناقص نسبتی، بدون کار صفر", () => {
    expect(exerciseDayPct({ ...base, completed: true })).toBe(100);
    expect(exerciseDayPct({ ...base, doneItems: 5 })).toBe(99);
    expect(exerciseDayPct({ ...base, doneItems: 2 })).toBe(40);
    expect(exerciseDayPct(base)).toBe(0);
  });
});

describe("calorieDayPct", () => {
  it("ثبت‌نشده صفر", () => {
    expect(calorieDayPct(0, 2000, false)).toBe(0);
  });
  it("داخل 10 درصد هدف کامل", () => {
    expect(calorieDayPct(2100, 2000, true)).toBe(100);
    expect(calorieDayPct(1850, 2000, true)).toBe(100);
  });
  it("دورتر کمتر، ولی ثبت‌شده هیچ‌وقت زیر 10 نمی‌ره", () => {
    expect(calorieDayPct(2600, 2000, true)).toBe(60);
    expect(calorieDayPct(300, 2000, true)).toBe(10);
  });
  it("بدون هدف ثبت‌شده کامله", () => {
    expect(calorieDayPct(500, null, true)).toBe(100);
  });
});

describe("buildPctHeat", () => {
  const today = new Date(2026, 10, 28); // شنبه
  it("13 ستون 7 تایی با امروز و آینده", () => {
    const h = buildPctHeat(today, 13, { "2026-11-28": 100, "2026-11-27": 40 });
    expect(h).toHaveLength(13);
    expect(h.every((c) => c.length === 7)).toBe(true);
    const flat = h.flat();
    expect(flat.filter((c) => c.today)).toHaveLength(1);
    expect(flat.find((c) => c.iso === "2026-11-28")?.pct).toBe(100);
    expect(flat.filter((c) => c.future).every((c) => c.pct === null)).toBe(true);
    expect(streakFromHeatmap(h)).toBe(1);
    expect(heatLevel(40)).toBe(2);
  });
  it("heatDays و heatDaysToMap", () => {
    const add = (iso: string, n: number) => { const [y, m, d] = iso.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
    const days = heatDays("2026-11-28", 3, (iso) => (iso === "2026-11-28" ? 100 : null), add);
    expect(days.map((d) => d.iso)).toEqual(["2026-11-26", "2026-11-27", "2026-11-28"]);
    expect(heatDaysToMap(days)["2026-11-28"]).toBe(100);
  });
});
