import { describe, it, expect } from "vitest";
import {
  addDaysIso, buildWeekReport, gradeOf, isWeekStart, lastFinishedWeekStart, maskWeekData, parseWeekData,
  recentWeekStarts, weekDatesOf, weekEndOf, weekIndexOf, weekStartOf, type CoachDayInput,
} from "@/lib/coachWeek";

// 2026-10-24 شنبه است
describe("week boundaries", () => {
  it("saturday start", () => {
    expect(weekStartOf("2026-10-24")).toBe("2026-10-24");
    expect(weekStartOf("2026-10-25")).toBe("2026-10-24");
    expect(weekStartOf("2026-10-30")).toBe("2026-10-24");
    expect(weekStartOf("2026-10-23")).toBe("2026-10-17");
    expect(isWeekStart("2026-10-24")).toBe(true);
    expect(isWeekStart("2026-10-25")).toBe(false);
    expect(weekEndOf("2026-10-24")).toBe("2026-10-30");
    expect(weekDatesOf("2026-10-24")).toHaveLength(7);
  });
  it("last finished and recent", () => {
    expect(lastFinishedWeekStart("2026-10-27")).toBe("2026-10-17");
    expect(recentWeekStarts("2026-10-27", 3)).toEqual(["2026-10-24", "2026-10-17", "2026-10-10"]);
    expect(addDaysIso("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("week index", () => {
    expect(weekIndexOf("2026-10-14", "2026-10-10")).toBe(1);
    expect(weekIndexOf("2026-10-14", "2026-10-24")).toBe(3);
    expect(weekIndexOf(null, "2026-10-24")).toBe(1);
  });
});

describe("grade", () => {
  it("thresholds", () => {
    expect(gradeOf(100)).toBe("great");
    expect(gradeOf(80)).toBe("great");
    expect(gradeOf(79)).toBe("good");
    expect(gradeOf(50)).toBe("good");
    expect(gradeOf(49)).toBe("low");
    expect(gradeOf(0)).toBe("low");
    expect(gradeOf(null)).toBe("none");
  });
});

function days(ws: string, f: (i: number) => Partial<CoachDayInput>): CoachDayInput[] {
  return weekDatesOf(ws).map((date, i) => ({ date, routineDone: null, routineTotal: null, workout: null, sleepMinutes: null, ...f(i) }));
}
const base = { mentorshipId: "m1", weekStart: "2026-10-17", todayIso: "2026-10-27", startedIso: "2026-10-01", workoutAccess: true, workoutsPlanned: 3, streak: 4, prevRoutineRate: 60 };

describe("buildWeekReport", () => {
  it("computes rates, delta, workouts, sleep", () => {
    const r = buildWeekReport({
      ...base,
      days: days("2026-10-17", (i) => ({ routineDone: i < 4 ? 2 : 1, routineTotal: 2, workout: i < 3, sleepMinutes: i < 2 ? 420 : null })),
    });
    expect(r.complete).toBe(true);
    expect(r.routineRate).toBe(Math.round(((4 * 2 + 3 * 1) / 14) * 100)); // 79
    expect(r.routineDelta).toBe(19);
    expect(r.workoutsDone).toBe(3);
    expect(r.workoutsPlanned).toBe(3);
    expect(r.sleepAvgMinutes).toBe(420);
    expect(r.days).toHaveLength(7);
    expect(r.days[0].routineRate).toBe(100);
    expect(r.days[6].routineRate).toBe(50);
    expect(r.grade).toBe("good");
    expect(r.weekIndex).toBe(4);
  });
  it("hidden data is null, never zero", () => {
    const r = buildWeekReport({
      ...base,
      workoutAccess: false,
      streak: null,
      prevRoutineRate: null,
      days: days("2026-10-17", () => ({ workout: true, sleepMinutes: null })),
    });
    expect(r.routineRate).toBeNull();
    expect(r.routineDelta).toBeNull();
    expect(r.workoutsDone).toBeNull();
    expect(r.workoutsPlanned).toBeNull();
    expect(r.sleepAvgMinutes).toBeNull();
    expect(r.days.every((d) => d.routineRate === null && d.workout === null)).toBe(true);
    expect(r.grade).toBe("none");
  });
  it("current week is not complete; zero totals are null", () => {
    const r = buildWeekReport({ ...base, weekStart: "2026-10-24", days: days("2026-10-24", () => ({ routineDone: 0, routineTotal: 0 })) });
    expect(r.complete).toBe(false);
    expect(r.routineRate).toBeNull();
  });
  it("grade falls back to workout ratio", () => {
    const r = buildWeekReport({ ...base, prevRoutineRate: null, days: days("2026-10-17", (i) => ({ workout: i < 3 })) });
    expect(r.routineRate).toBeNull();
    expect(r.grade).toBe("great");
  });
});

describe("mask and parse", () => {
  const full = buildWeekReport({ ...base, days: days("2026-10-17", () => ({ routineDone: 1, routineTotal: 1, workout: true, sleepMinutes: 400 })) });
  it("masks to null with current privacy", () => {
    const m = maskWeekData(full, { progress: false, workouts: false, sleep: false });
    expect(m.routineRate).toBeNull();
    expect(m.workoutsDone).toBeNull();
    expect(m.sleepAvgMinutes).toBeNull();
    expect(m.streak).toBeNull();
    expect(m.grade).toBe("none");
    expect(maskWeekData(full, { progress: true, workouts: true, sleep: true })).toEqual(full);
  });
  it("parse is defensive", () => {
    expect(parseWeekData(null, "m1", "2026-10-17")).toBeNull();
    expect(parseWeekData({ days: "x" }, "m1", "2026-10-17")).toBeNull();
    const p = parseWeekData(JSON.parse(JSON.stringify(full)), "m1", "2026-10-17");
    expect(p?.routineRate).toBe(100);
    expect(p?.days).toHaveLength(7);
  });
});
