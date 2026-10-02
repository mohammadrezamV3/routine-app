import { describe, it, expect } from "vitest";
import {
  goalFromTargets,
  sleepScore,
  scoreBand,
  sleepInsights,
  wakeTimesFor,
  bedTimesFor,
  sleepPhase,
  clockDistance,
  isFreeNight,
  sanitizeTags,
  moonPhase,
  minutesToClock,
  sleepMinutes,
  buildSleepTimes,
  addDaysIso,
  type SleepRecord,
} from "@/lib/sleep";
import { draftFromTracking, type SleepTracking } from "@/lib/sleepTracker";
import { isoLocal } from "@/lib/jalali";

describe("sleep pure functions", () => {
  // ─ goalFromTargets ────────────────────────────────
  describe("goalFromTargets", () => {
    it("calculates goal from wake and sleep times", () => {
      const target = { wake: "09:30", sleep: "01:30" };
      // 09:30 - 01:30 = 8:00 = 480 minutes
      expect(goalFromTargets(target)).toBe(480);
    });

    it("clamps goal to 6..10 hours", () => {
      // 4 hours goal → clamped to 360
      const tooShort = { wake: "05:00", sleep: "01:00" };
      expect(goalFromTargets(tooShort)).toBe(360);

      // 12 hours goal → clamped to 600
      const tooLong = { wake: "13:00", sleep: "01:00" };
      expect(goalFromTargets(tooLong)).toBe(600);
    });

    it("returns default 480 (8h) when target is null", () => {
      expect(goalFromTargets(null)).toBe(480);
      expect(goalFromTargets(undefined)).toBe(480);
    });

    it("returns default 480 when times are invalid", () => {
      expect(goalFromTargets({ wake: "25:00", sleep: "01:30" })).toBe(480);
      expect(goalFromTargets({ wake: "09:30", sleep: "60:00" })).toBe(480);
    });
  });

  // ─ sleepScore ────────────────────────────────────
  describe("sleepScore", () => {
    it("scores a perfect night 100", () => {
      const sleepTimes = buildSleepTimes("2026-10-02", "01:30", "09:30")!;
      const rec: SleepRecord = {
        date: "2026-10-02",
        sleptAt: sleepTimes.sleptAt.toISOString(),
        wokeAt: sleepTimes.wokeAt.toISOString(),
        quality: 5,
        note: null,
      };
      const ctx = { goalMin: 480, targetBedMin: 1 * 60 + 30 };
      const s = sleepScore(rec, ctx);
      expect(s.score).toBe(100);
      expect(s.parts.quality).toBe(100);
    });

    it("scores a 4-hour night lower", () => {
      const sleepTimes = buildSleepTimes("2026-10-02", "01:30", "05:30")!;
      const rec: SleepRecord = {
        date: "2026-10-02",
        sleptAt: sleepTimes.sleptAt.toISOString(),
        wokeAt: sleepTimes.wokeAt.toISOString(),
        quality: 3,
        note: null,
      };
      const ctx = { goalMin: 480, targetBedMin: 1 * 60 + 30 };
      const s = sleepScore(rec, ctx);
      expect(s.score).toBeLessThan(70);
      expect(s.score).toBeGreaterThan(0);
    });

    it("renormalizes weights when quality is missing", () => {
      const sleepTimes = buildSleepTimes("2026-10-02", "01:30", "09:30")!;
      const rec: SleepRecord = {
        date: "2026-10-02",
        sleptAt: sleepTimes.sleptAt.toISOString(),
        wokeAt: sleepTimes.wokeAt.toISOString(),
        quality: null,
        note: null,
      };
      const ctx = { goalMin: 480, targetBedMin: 1 * 60 + 30 };
      const s = sleepScore(rec, ctx);
      expect(s.score).toBeGreaterThan(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(s.parts.quality).toBeNull();
    });

    it("handles continuity fields (latency, awakenings)", () => {
      const sleepTimes = buildSleepTimes("2026-10-02", "01:30", "09:30")!;
      const rec: SleepRecord = {
        date: "2026-10-02",
        sleptAt: sleepTimes.sleptAt.toISOString(),
        wokeAt: sleepTimes.wokeAt.toISOString(),
        quality: 5,
        note: null,
        latencyMin: 30,
        awakenings: 2,
      };
      const ctx = { goalMin: 480, targetBedMin: 1 * 60 + 30 };
      const s = sleepScore(rec, ctx);
      expect(s.parts.continuity).toBeLessThan(100);
      expect(s.score).toBeLessThan(100);
    });
  });

  // ─ scoreBand ────────────────────────────────────
  describe("scoreBand", () => {
    it("bands score >= 85 as great", () => {
      expect(scoreBand(100)).toBe("great");
      expect(scoreBand(85)).toBe("great");
    });

    it("bands score 70..84 as good", () => {
      expect(scoreBand(84)).toBe("good");
      expect(scoreBand(70)).toBe("good");
    });

    it("bands score 50..69 as fair", () => {
      expect(scoreBand(69)).toBe("fair");
      expect(scoreBand(50)).toBe("fair");
    });

    it("bands score < 50 as poor", () => {
      expect(scoreBand(49)).toBe("poor");
      expect(scoreBand(0)).toBe("poor");
    });
  });

  // ─ sleepInsights ────────────────────────────────
  describe("sleepInsights", () => {
    it("computes debt7Min for last 7 nights", () => {
      const today = "2026-10-02";
      const entries: SleepRecord[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = addDaysIso(today, -i);
        const st = buildSleepTimes(date, "01:30", "09:30")!;
        entries.push({
          date,
          sleptAt: st.sleptAt.toISOString(),
          wokeAt: st.wokeAt.toISOString(),
          quality: 5,
          note: null,
        });
      }
      const target = { wake: "09:30", sleep: "01:30" };
      const ins = sleepInsights(entries, target, today);
      // All nights are 480 min (goal), so debt = 0
      expect(ins.debt7Min).toBe(0);
    });

    it("breaks goalStreak on gap day", () => {
      const today = "2026-10-02";
      const entries: SleepRecord[] = [];
      // Two nights with a gap: d1 is 2 days ago, skip d2 = yesterday entirely
      const d1 = addDaysIso(today, -2);
      const d3 = addDaysIso(today, -4); // older night before the gap
      for (const date of [d3, d1]) {
        const st = buildSleepTimes(date, "01:30", "09:30")!;
        entries.push({
          date,
          sleptAt: st.sleptAt.toISOString(),
          wokeAt: st.wokeAt.toISOString(),
          quality: 5,
          note: null,
        });
      }
      // Missing yesterday (d2)
      const target = { wake: "09:30", sleep: "01:30" };
      const ins = sleepInsights(entries, target, today);
      // Last entry is d1 (2 days ago), not yesterday → streak breaks
      expect(ins.goalStreak).toBe(0);
    });

    it("continues goalStreak when last night is yesterday", () => {
      const today = "2026-10-02";
      const yesterday = addDaysIso(today, -1);
      const entries: SleepRecord[] = [];
      const st = buildSleepTimes(yesterday, "01:30", "09:30")!;
      entries.push({
        date: yesterday,
        sleptAt: st.sleptAt.toISOString(),
        wokeAt: st.wokeAt.toISOString(),
        quality: 5,
        note: null,
      });
      const target = { wake: "09:30", sleep: "01:30" };
      const ins = sleepInsights(entries, target, today);
      expect(ins.goalStreak).toBe(1);
    });

    it("resets goalStreak when night is out of goal", () => {
      const today = "2026-10-02";
      const yesterday = addDaysIso(today, -1);
      const entries: SleepRecord[] = [];
      // 4-hour night, well below goal
      const st = buildSleepTimes(yesterday, "01:30", "05:30")!;
      entries.push({
        date: yesterday,
        sleptAt: st.sleptAt.toISOString(),
        wokeAt: st.wokeAt.toISOString(),
        quality: 3,
        note: null,
      });
      const target = { wake: "09:30", sleep: "01:30" };
      const ins = sleepInsights(entries, target, today);
      expect(ins.goalStreak).toBe(0);
    });

    it("includes tagImpacts only with >= 2 nights with and without", () => {
      const today = "2026-10-02";
      const entries: SleepRecord[] = [];
      // 4 nights with caffeine: avg 70
      for (let i = 3; i >= 0; i--) {
        const date = addDaysIso(today, -i);
        const st = buildSleepTimes(date, "01:30", "07:30")!;
        entries.push({
          date,
          sleptAt: st.sleptAt.toISOString(),
          wokeAt: st.wokeAt.toISOString(),
          quality: 3,
          note: null,
          tags: ["caffeine"],
        });
      }
      // 4 nights without caffeine: avg 90
      for (let i = 7; i >= 4; i--) {
        const date = addDaysIso(today, -i);
        const st = buildSleepTimes(date, "01:30", "08:30")!;
        entries.push({
          date,
          sleptAt: st.sleptAt.toISOString(),
          wokeAt: st.wokeAt.toISOString(),
          quality: 4,
          note: null,
        });
      }
      const target = { wake: "09:30", sleep: "01:30" };
      const ins = sleepInsights(entries, target, today);
      const caffeine = ins.tagImpacts.find((t) => t.key === "caffeine");
      expect(caffeine).toBeDefined();
      expect(caffeine!.nights).toBe(4);
    });

    it("computes trend from last 7 vs previous 7 nights", () => {
      const today = "2026-10-02";
      const entries: SleepRecord[] = [];
      // Last 7 nights: good sleep (score ~80+)
      for (let i = 6; i >= 0; i--) {
        const date = addDaysIso(today, -i);
        const st = buildSleepTimes(date, "01:30", "09:30")!;
        entries.push({
          date,
          sleptAt: st.sleptAt.toISOString(),
          wokeAt: st.wokeAt.toISOString(),
          quality: 5,
          note: null,
        });
      }
      // Previous 7 nights: poor sleep (score ~40)
      for (let i = 13; i >= 7; i--) {
        const date = addDaysIso(today, -i);
        const st = buildSleepTimes(date, "01:30", "05:30")!;
        entries.push({
          date,
          sleptAt: st.sleptAt.toISOString(),
          wokeAt: st.wokeAt.toISOString(),
          quality: 2,
          note: null,
        });
      }
      const target = { wake: "09:30", sleep: "01:30" };
      const ins = sleepInsights(entries, target, today);
      expect(ins.trend).toBeGreaterThan(0);
    });

    it("requires >= 3 nights in each week for trend", () => {
      const today = "2026-10-02";
      const entries: SleepRecord[] = [];
      // Only 2 nights total
      const d1 = addDaysIso(today, -1);
      const st1 = buildSleepTimes(d1, "01:30", "09:30")!;
      entries.push({
        date: d1,
        sleptAt: st1.sleptAt.toISOString(),
        wokeAt: st1.wokeAt.toISOString(),
        quality: 5,
        note: null,
      });
      const target = { wake: "09:30", sleep: "01:30" };
      const ins = sleepInsights(entries, target, today);
      expect(ins.trend).toBeNull();
    });

    it("computes bestBedWindow from 30-min buckets", () => {
      const today = "2026-10-02";
      const entries: SleepRecord[] = [];
      // Multiple nights at 01:30 (best bed window)
      for (let i = 3; i >= 0; i--) {
        const date = addDaysIso(today, -i);
        const st = buildSleepTimes(date, "01:30", "09:30")!;
        entries.push({
          date,
          sleptAt: st.sleptAt.toISOString(),
          wokeAt: st.wokeAt.toISOString(),
          quality: 5,
          note: null,
        });
      }
      const target = { wake: "09:30", sleep: "01:30" };
      const ins = sleepInsights(entries, target, today);
      expect(ins.bestBedWindow).toBeDefined();
      expect(ins.bestBedWindow?.nights).toBeGreaterThanOrEqual(2);
    });

    it("returns null bestBedWindow with < 2 nights in bucket", () => {
      const today = "2026-10-02";
      const entries: SleepRecord[] = [];
      // Only 1 night at 01:30
      const d1 = addDaysIso(today, -1);
      const st1 = buildSleepTimes(d1, "01:30", "09:30")!;
      entries.push({
        date: d1,
        sleptAt: st1.sleptAt.toISOString(),
        wokeAt: st1.wokeAt.toISOString(),
        quality: 5,
        note: null,
      });
      const target = { wake: "09:30", sleep: "01:30" };
      const ins = sleepInsights(entries, target, today);
      expect(ins.bestBedWindow).toBeNull();
    });
  });

  // ─ wakeTimesFor / bedTimesFor ─────────────────
  describe("wakeTimesFor", () => {
    it("calculates wake times from bed time with 90-min cycles", () => {
      // Bed at 23:00 (1380 min), latency 15 min
      // 4 cycles: 1380 + 15 + 360 = 1755 → 29:15 → 05:15
      const result = wakeTimesFor(23 * 60, 15);
      expect(result).toHaveLength(3);
      expect(result[2].cycles).toBe(4);
      expect(result[2].sleepMin).toBe(360);
    });

    it("handles wraparound past midnight", () => {
      // Bed at 23:00, should wrap around
      const result = wakeTimesFor(23 * 60, 15);
      // All clocks should be valid HH:mm format and within 0..23:59
      result.forEach((r) => {
        const [h, m] = r.clock.split(":").map(Number);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(23);
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThan(60);
      });
    });
  });

  describe("bedTimesFor", () => {
    it("calculates bed times from wake time", () => {
      // Wake at 08:15 (495 min), latency 15 min
      // 4 cycles: 495 - 15 - 360 = 120 → 02:00
      const result = bedTimesFor(8 * 60 + 15, 15);
      expect(result).toHaveLength(3);
      expect(result[2].cycles).toBe(4);
    });
  });

  // ─ sleepPhase ──────────────────────────────────
  describe("sleepPhase", () => {
    it("returns 'morning' within 4 hours of wake time", () => {
      const target = { wake: "07:00", sleep: "23:00" };
      const wakeMin = 7 * 60; // 07:00
      const nowMin = wakeMin + 120; // 2 hours after wake = 09:00
      expect(sleepPhase(nowMin, target)).toBe("morning");
    });

    it("returns 'winddown' 90- min before bed", () => {
      const target = { wake: "07:00", sleep: "23:00" };
      const bedMin = 23 * 60; // 23:00
      const nowMin = bedMin - 60; // 60 min before = 21:60 (valid winddown)
      expect(sleepPhase(nowMin, target)).toBe("winddown");
    });

    it("returns 'bedtime' within 60 min after bed", () => {
      const target = { wake: "07:00", sleep: "23:00" };
      const bedMin = 23 * 60; // 23:00
      const nowMin = bedMin + 30; // 30 min after = 23:30
      expect(sleepPhase(nowMin, target)).toBe("bedtime");
    });

    it("returns 'night' between bed and morning", () => {
      const target = { wake: "07:00", sleep: "23:00" };
      const nowMin = 2 * 60; // 02:00 (between 23:00 and 07:00)
      expect(sleepPhase(nowMin, target)).toBe("night");
    });

    it("returns 'day' during daytime hours", () => {
      const target = { wake: "07:00", sleep: "23:00" };
      const nowMin = 14 * 60; // 14:00
      expect(sleepPhase(nowMin, target)).toBe("day");
    });
  });

  // ─ clockDistance ───────────────────────────────
  describe("clockDistance", () => {
    it("calculates circular distance between two clocks", () => {
      // Distance from 22:00 to 02:00 = 4 hours = 240 min (shorter way)
      expect(clockDistance(22 * 60, 2 * 60)).toBe(240);
    });

    it("returns 0 for same time", () => {
      expect(clockDistance(10 * 60, 10 * 60)).toBe(0);
    });

    it("is symmetric", () => {
      expect(clockDistance(5 * 60, 10 * 60)).toBe(clockDistance(10 * 60, 5 * 60));
    });

    it("uses shorter arc", () => {
      // Distance from 00:00 to 23:00
      // Shorter: 60 min (1 hour back), not 1380 min (23 hours forward)
      expect(clockDistance(0, 23 * 60)).toBe(60);
    });
  });

  // ─ isFreeNight ────────────────────────────────
  describe("isFreeNight", () => {
    // Thursday is day 4, Friday is day 5 (0=Sunday)
    it("returns true for Thursday wake (day 4)", () => {
      // Find a Thursday: 2026-10-01 is a Thursday
      expect(isFreeNight("2026-10-01")).toBe(true);
    });

    it("returns true for Friday wake (day 5)", () => {
      // 2026-10-02 is a Friday
      expect(isFreeNight("2026-10-02")).toBe(true);
    });

    it("returns false for other days", () => {
      // 2026-10-03 is Saturday
      expect(isFreeNight("2026-10-03")).toBe(false);
      // 2026-10-04 is Sunday
      expect(isFreeNight("2026-10-04")).toBe(false);
      // 2026-10-05 is Monday
      expect(isFreeNight("2026-10-05")).toBe(false);
    });
  });

  // ─ sanitizeTags ────────────────────────────────
  describe("sanitizeTags", () => {
    it("keeps valid tags", () => {
      const result = sanitizeTags(["caffeine", "screen"]);
      expect(result).toContain("caffeine");
      expect(result).toContain("screen");
    });

    it("drops unknown tags", () => {
      const result = sanitizeTags(["caffeine", "unknown_tag"]);
      expect(result).toContain("caffeine");
      expect(result).not.toContain("unknown_tag");
    });

    it("drops duplicates", () => {
      const result = sanitizeTags(["caffeine", "caffeine", "screen"]);
      expect(result).toEqual(["caffeine", "screen"]);
    });

    it("returns empty array for non-array input", () => {
      expect(sanitizeTags("caffeine")).toEqual([]);
      expect(sanitizeTags(null)).toEqual([]);
    });
  });

  // ─ moonPhase ───────────────────────────────────
  describe("moonPhase", () => {
    it("returns value between 0 and 1", () => {
      const dates = [
        new Date(2026, 0, 1),
        new Date(2026, 6, 15),
        new Date(2026, 11, 31),
      ];
      dates.forEach((d) => {
        const p = moonPhase(d);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(1);
      });
    });

    it("cycles through phase changes", () => {
      // Two dates ~7 days apart should show progression
      const d1 = new Date(2000, 0, 6, 18, 14); // Reference new moon
      const d2 = new Date(2000, 0, 13, 18, 14); // 7 days later
      const p1 = moonPhase(d1);
      const p2 = moonPhase(d2);
      // p2 should be farther along in the cycle
      expect(p2).toBeGreaterThan(p1);
    });
  });

  // ─ draftFromTracking ───────────────────────────
  describe("draftFromTracking", () => {
    it("returns null when sleep < 30 minutes", () => {
      const now = new Date("2026-10-02T08:00:00Z");
      const t: SleepTracking = { startedAt: new Date(now.getTime() - 20 * 60000).toISOString() };
      expect(draftFromTracking(t, now)).toBeNull();
    });

    it("returns null when sleep > 20 hours", () => {
      const now = new Date("2026-10-02T08:00:00Z");
      const t: SleepTracking = { startedAt: new Date(now.getTime() - 21 * 60 * 60000).toISOString() };
      expect(draftFromTracking(t, now)).toBeNull();
    });

    it("returns valid draft for sleep >= 30 minutes", () => {
      const now = new Date("2026-10-02T08:00:00Z");
      const startedAt = new Date(now.getTime() - 8 * 60 * 60000); // 8 hours ago
      const t: SleepTracking = { startedAt: startedAt.toISOString() };
      const draft = draftFromTracking(t, now);
      expect(draft).toBeDefined();
      expect(draft!.date).toBe(isoLocal(now));
      expect(draft!.sleptAt).toBe(startedAt.toISOString());
      expect(draft!.wokeAt).toBe(now.toISOString());
    });

    it("uses current time when not provided", () => {
      // Just verify it doesn't crash
      const t: SleepTracking = { startedAt: new Date(Date.now() - 7 * 60 * 60000).toISOString() };
      const draft = draftFromTracking(t);
      expect(draft).toBeDefined();
    });
  });

  // ─ minutesToClock ──────────────────────────────
  describe("minutesToClock", () => {
    it("converts minutes to HH:mm", () => {
      expect(minutesToClock(0)).toBe("00:00");
      expect(minutesToClock(60)).toBe("01:00");
      expect(minutesToClock(630)).toBe("10:30"); // 10.5 hours
      expect(minutesToClock(1439)).toBe("23:59");
    });

    it("wraps around past 1440 minutes", () => {
      expect(minutesToClock(1440)).toBe("00:00");
      expect(minutesToClock(1500)).toBe("01:00");
    });

    it("handles negative values with wraparound", () => {
      expect(minutesToClock(-60)).toBe("23:00");
      expect(minutesToClock(-1)).toBe("23:59");
    });
  });
});
