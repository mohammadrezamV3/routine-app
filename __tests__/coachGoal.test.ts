import { describe, it, expect } from "vitest";
import { effectiveStatus, evaluateGoal, goalEndDate, goalWeekStarts, validateGoalInput, weekValueFor, type GoalCore } from "@/lib/coachGoal";

const goal: GoalCore = { metric: "WORKOUT_SESSIONS", target: 3, weeks: 4, startDate: "2026-10-03", endDate: goalEndDate("2026-10-03", 4), status: "ACTIVE" };

describe("goal dates", () => {
  it("end date and week starts", () => {
    expect(goal.endDate).toBe("2026-10-30");
    expect(goalWeekStarts("2026-10-03", 4)).toEqual(["2026-10-03", "2026-10-10", "2026-10-17", "2026-10-24"]);
  });
  it("week value by metric", () => {
    expect(weekValueFor("ROUTINE_RATE", { routineRate: 70, workoutsDone: 2 })).toBe(70);
    expect(weekValueFor("WORKOUT_SESSIONS", { routineRate: 70, workoutsDone: null })).toBeNull();
  });
});

describe("evaluateGoal", () => {
  const values = { "2026-10-03": 3, "2026-10-10": 2, "2026-10-17": 4, "2026-10-24": 1 };
  it("mid goal", () => {
    const ev = evaluateGoal(goal, values, "2026-10-26");
    expect(ev.weeksPassed).toBe(3);
    expect(ev.weeksMet).toBe(2);
    expect(ev.weeksLeft).toBe(1);
    expect(ev.totalDone).toBe(10);
    expect(ev.status).toBe("ACTIVE");
    expect(ev.history[3].current).toBe(true);
    expect(ev.history[3].met).toBe(false);
    expect(ev.justCompleted).toBe(false);
  });
  it("done after end date", () => {
    const ev = evaluateGoal(goal, values, "2026-10-31");
    expect(ev.status).toBe("DONE");
    expect(ev.weeksPassed).toBe(4);
    expect(ev.weeksLeft).toBe(0);
    expect(ev.justCompleted).toBe(true);
    expect(evaluateGoal({ ...goal, status: "DONE" }, values, "2026-10-31").justCompleted).toBe(false);
  });
  it("future weeks null, hidden stays null", () => {
    const ev = evaluateGoal(goal, { "2026-10-03": null, "2026-10-24": 9 }, "2026-10-05");
    expect(ev.history[0].value).toBeNull();
    expect(ev.history[0].met).toBe(false);
    expect(ev.history[3].value).toBeNull();
    expect(ev.weeksMet).toBe(0);
  });
  it("ended stays ended", () => {
    expect(effectiveStatus("ENDED", "2026-10-30", "2026-12-01")).toBe("ENDED");
  });
});

describe("validateGoalInput", () => {
  const today = "2026-10-27";
  it("accepts and snaps to saturday", () => {
    const v = validateGoalInput({ title: " 4 جلسه ", metric: "WORKOUT_SESSIONS", target: 4, weeks: 8 }, today);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.value.startDate).toBe("2026-10-24");
      expect(v.value.endDate).toBe("2026-12-18");
      expect(v.value.title).toBe("4 جلسه");
    }
  });
  it("rejects bad input", () => {
    expect(validateGoalInput({ title: "", metric: "ROUTINE_RATE", target: 80, weeks: 4 }, today).ok).toBe(false);
    expect(validateGoalInput({ title: "x", metric: "NOPE", target: 80, weeks: 4 }, today).ok).toBe(false);
    expect(validateGoalInput({ title: "x", metric: "ROUTINE_RATE", target: 101, weeks: 4 }, today).ok).toBe(false);
    expect(validateGoalInput({ title: "x", metric: "WORKOUT_SESSIONS", target: 15, weeks: 4 }, today).ok).toBe(false);
    expect(validateGoalInput({ title: "x", metric: "ROUTINE_RATE", target: 80, weeks: 53 }, today).ok).toBe(false);
    expect(validateGoalInput({ title: "x", metric: "ROUTINE_RATE", target: 80, weeks: 4, startDate: "2025-01-01" }, today).ok).toBe(false);
    expect(validateGoalInput({ title: "x", metric: "ROUTINE_RATE", target: 80.5, weeks: 4 }, today).ok).toBe(false);
  });
});
