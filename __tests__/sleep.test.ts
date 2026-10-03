import { describe, it, expect } from "vitest";
import { buildSleepTimes, circularMeanMinutes, sleepMinutes, summarizeSleep, timelineSpan, type SleepRecord } from "@/lib/sleep";

describe("buildSleepTimes", () => {
  it("bed before midnight belongs to previous night", () => {
    const t = buildSleepTimes("2026-03-10", "23:30", "07:00")!;
    expect(t.sleptAt.getDate()).toBe(9);
    expect(t.wokeAt.getTime() - t.sleptAt.getTime()).toBe(450 * 60000);
  });
  it("00:00 bed is the same calendar day", () => {
    const t = buildSleepTimes("2026-03-10", "00:00", "07:00")!;
    expect(t.sleptAt.getDate()).toBe(10);
    expect(t.wokeAt.getTime() - t.sleptAt.getTime()).toBe(420 * 60000);
  });
  it("equal times give 24h (rejected by range check)", () => {
    const t = buildSleepTimes("2026-03-10", "07:00", "07:00")!;
    expect(sleepMinutes({ sleptAt: t.sleptAt.toISOString(), wokeAt: t.wokeAt.toISOString() })).toBe(1440);
  });
  it("rejects garbage", () => {
    expect(buildSleepTimes("x", "23:00", "07:00")).toBeNull();
    expect(buildSleepTimes("2026-13-10", "23:00", "07:00")).toBeNull();
    expect(buildSleepTimes("2026-03-10", "24:00", "07:00")).toBeNull();
    expect(buildSleepTimes("2026-03-10", "", "07:00")).toBeNull();
  });
  it("wake date round-trips via local getters", () => {
    const t = buildSleepTimes("2026-01-01", "23:00", "06:00")!;
    expect(t.wokeAt.getFullYear()).toBe(2026);
    expect(t.sleptAt.getFullYear()).toBe(2025);
  });
});

describe("timelineSpan", () => {
  const S = 20 * 60, N = 16 * 60;
  it("normal night", () => expect(timelineSpan(23 * 60, 480, S, N)).toEqual({ from: 180, to: 660 }));
  it("early evening bed starts at axis top, not bottom", () => {
    const r = timelineSpan(18 * 60, 600, S, N);
    expect(r.from).toBe(0);
    expect(r.to).toBe(480);
  });
  it("clamps past noon", () => expect(timelineSpan(3 * 60, 600, S, N).to).toBe(N));
});

describe("summarizeSleep", () => {
  const rec = (bed: string, wake: string, d: string): SleepRecord => ({ date: d, sleptAt: bed, wokeAt: wake, quality: null, note: null });
  it("circular mean around midnight", () => {
    expect(circularMeanMinutes([23 * 60, 60])).toBe(0);
  });
  it("ignores non-positive nights and is empty-safe", () => {
    expect(summarizeSleep([]).nights).toBe(0);
    expect(summarizeSleep([rec("2026-03-10T08:00:00Z", "2026-03-10T07:00:00Z", "2026-03-10")]).nights).toBe(0);
  });
  it("debt never negative", () => {
    const s = summarizeSleep([rec("2026-03-09T20:00:00Z", "2026-03-10T08:00:00Z", "2026-03-10")]);
    expect(s.debtMin).toBe(0);
  });
});

import { isFutureWake } from "@/lib/sleep";
describe("isFutureWake", () => {
  const now = new Date(2026, 9, 3, 3, 0);
  it("flags a wake time well after now", () => {
    expect(isFutureWake(new Date(2026, 9, 3, 7, 0), now)).toBe(true);
  });
  it("allows past and near-now wake times", () => {
    expect(isFutureWake(new Date(2026, 9, 3, 2, 0), now)).toBe(false);
    expect(isFutureWake(new Date(2026, 9, 3, 3, 4), now)).toBe(false);
  });
});
