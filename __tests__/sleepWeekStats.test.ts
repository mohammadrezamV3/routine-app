import { describe, expect, it } from "vitest";
import { barHeight, bedSpread, bestNight, buildWeekNights, goalDiffKind, lastLogged, signedDuration, weekAverage } from "@/lib/sleepWeekStats";
import type { SleepRecord } from "@/lib/sleep";

function rec(date: string, bedH: number, durH: number): SleepRecord {
  const woke = new Date(`${date}T07:00:00`);
  const slept = new Date(woke.getTime() - durH * 3600000);
  return { date, sleptAt: slept.toISOString(), wokeAt: woke.toISOString() } as SleepRecord;
}

describe("sleepWeekStats", () => {
  const recs = [rec("2026-10-19", 23, 7), rec("2026-10-20", 23, 5), rec("2026-10-21", 23, 8)];
  const scores = [{ date: "2026-10-19", score: 80 }, { date: "2026-10-20", score: 40 }, { date: "2026-10-21", score: 80 }];
  const nights = buildWeekNights("2026-10-21", recs, scores, 420);

  it("builds seven nights oldest to newest", () => {
    expect(nights).toHaveLength(7);
    expect(nights[6].iso).toBe("2026-10-21");
    expect(nights[0].rec).toBeNull();
    expect(nights[6].diffGoal).toBe(60);
  });
  it("last logged and best night (tie goes to longer)", () => {
    expect(lastLogged(nights)?.iso).toBe("2026-10-21");
    expect(bestNight(nights)?.iso).toBe("2026-10-21");
    expect(bestNight(buildWeekNights("2026-10-21", [], [], 420))).toBeNull();
  });
  it("average", () => {
    expect(weekAverage(nights)).toBe(Math.round((420 + 300 + 480) / 3));
    expect(weekAverage(buildWeekNights("2026-10-21", [], [], 420))).toBeNull();
  });
  it("bed spread needs 3 nights", () => {
    expect(bedSpread(recs.slice(0, 2))).toBeNull();
    expect(bedSpread(recs)).not.toBeNull();
  });
  it("bar height and signed duration", () => {
    expect(barHeight(0, 600, 96, 14)).toBe(0);
    expect(barHeight(30, 600, 96, 14)).toBe(14);
    expect(barHeight(900, 600, 96, 14)).toBe(96);
    expect(signedDuration(65)).toBe("+1:05");
    expect(signedDuration(-30)).toBe("-0:30");
    expect(signedDuration(2)).toBe("0:00");
    expect(goalDiffKind(20)).toBe("within");
    expect(goalDiffKind(-45)).toBe("under");
    expect(goalDiffKind(45)).toBe("over");
  });
});
