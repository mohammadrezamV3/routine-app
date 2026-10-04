import { describe, it, expect } from "vitest";
import { rankDomains, radarAxes, bestWorstDay } from "@/lib/weeklyAnalysis/domainView";
import { RADAR_MIN_AXES } from "@/lib/weeklyRadar";
import type { AnalysisDomain, DomainResult } from "@/lib/weeklyAnalysis/types";

const mk = (domain: AnalysisDomain, score: number | null, prevScore: number | null = null, hasData = score !== null): DomainResult => ({
  domain, active: true, hasData, score, prevScore, delta: score !== null && prevScore !== null ? score - prevScore : null,
  daysWithData: hasData ? 3 : 0, daily: [null, null, null, null, null, null, null], stats: [],
});

describe("rankDomains", () => {
  it("امتیاز نزولی؛ بدون داده ته فهرست با ترتیب اصلی", () => {
    const out = rankDomains([mk("routine", 51), mk("nutrition", null), mk("sleep", 75), mk("tasks", 70), mk("learning", null, null, false)]);
    expect(out.map((d) => d.domain)).toEqual(["sleep", "tasks", "routine", "nutrition", "learning"]);
  });
  it("امتیاز مساوی ترتیب ورودی رو حفظ می‌کنه و ورودی رو تغییر نمی‌ده", () => {
    const input = [mk("routine", 60), mk("sleep", 60), mk("tasks", 80)];
    const out = rankDomains(input);
    expect(out.map((d) => d.domain)).toEqual(["tasks", "routine", "sleep"]);
    expect(input.map((d) => d.domain)).toEqual(["routine", "sleep", "tasks"]);
  });
  it("hasData=false با امتیاز عددی بدون داده حساب می‌شه", () => {
    const out = rankDomains([mk("routine", 90, null, false), mk("sleep", 10)]);
    expect(out[0].domain).toBe("sleep");
  });
});

describe("radarAxes", () => {
  const label = (d: DomainResult) => d.domain;
  it("زیر حداقل محور = بدون رادار", () => {
    expect(radarAxes([mk("routine", 50), mk("sleep", 60), mk("tasks", null)], label)).toEqual([]);
    expect(RADAR_MIN_AXES).toBe(3);
  });
  it("فقط دامنه‌های دارای داده، با prev", () => {
    const axes = radarAxes([mk("routine", 50, 40), mk("sleep", 60), mk("tasks", 70, 80), mk("trading", null)], label);
    expect(axes).toEqual([
      { key: "routine", label: "routine", value: 50, prev: 40 },
      { key: "sleep", label: "sleep", value: 60, prev: null },
      { key: "tasks", label: "tasks", value: 70, prev: 80 },
    ]);
  });
});

describe("bestWorstDay", () => {
  const days = (future: number[] = []) => Array.from({ length: 7 }, (_, i) => ({ isFuture: future.includes(i) }));
  it("بهترین و ضعیف‌ترین", () => {
    expect(bestWorstDay([10, 90, null, 40, 20, 5, null], days())).toEqual({ best: 1, worst: 5 });
  });
  it("روز آینده و null حساب نمی‌شه", () => {
    expect(bestWorstDay([10, 20, 30, 99, null, null, null], days([3]))).toEqual({ best: 2, worst: 0 });
  });
  it("یک روز یا همه مساوی = null", () => {
    expect(bestWorstDay([50, null, null, null, null, null, null], days())).toBeNull();
    expect(bestWorstDay([50, 50, null, null, null, null, null], days())).toBeNull();
  });
});
