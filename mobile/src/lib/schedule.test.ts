import { describe, expect, it } from "vitest";
import { computeDayStats, tasksForDate, timeEndMinutes, timeStartMinutes } from "./schedule";

describe("tasksForDate", () => {
  const monday = new Date("2024-03-25T00:00:00"); // دوشنبه (jsDay=1)

  it("returns only occurrences matching the js weekday, sorted by start time", () => {
    const result = tasksForDate(monday, {
      customOccurrences: [
        { id: "a", name: "دیر", jsDay: 1, time: "۱۸:۰۰ – ۱۹:۰۰" },
        { id: "b", name: "زود", jsDay: 1, time: "۰۸:۰۰ – ۰۹:۰۰" },
        { id: "c", name: "روزِ دیگر", jsDay: 2, time: "۱۰:۰۰ – ۱۱:۰۰" },
      ],
    });
    expect(result.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("respects startDate/endDate window (missing means always-on)", () => {
    const before = tasksForDate(new Date("2024-03-01T00:00:00"), {
      customOccurrences: [{ id: "a", name: "x", jsDay: new Date("2024-03-01T00:00:00").getDay(), time: "۱۰:۰۰", startDate: "2024-03-10" }],
    });
    expect(before).toHaveLength(0);
  });

  it("filters out removedOccurrences by id|jsDay", () => {
    const result = tasksForDate(monday, {
      customOccurrences: [{ id: "a", name: "x", jsDay: 1, time: "۱۰:۰۰" }],
      removedOccurrences: new Set(["a|1"]),
    });
    expect(result).toHaveLength(0);
  });
});

describe("time parsing", () => {
  it("timeStartMinutes / timeEndMinutes parse Persian-digit ranges", () => {
    expect(timeStartMinutes("۱۰:۳۰ – ۱۹:۳۰")).toBe(10 * 60 + 30);
    expect(timeEndMinutes("۱۰:۳۰ – ۱۹:۳۰")).toBe(19 * 60 + 30);
  });
});

describe("computeDayStats", () => {
  it("computes completed/total/pct from a daily record", () => {
    const d = new Date("2024-03-25T00:00:00");
    const opts = { removedOccurrences: new Set<string>(), customOccurrences: [
      { id: "a", name: "x", jsDay: 1, time: "۱۰:۰۰" },
      { id: "b", name: "y", jsDay: 1, time: "۱۲:۰۰" },
    ] };
    const stats = computeDayStats(d, opts, { tasks: { a: true, b: false } });
    expect(stats).toEqual({ completed: 1, total: 2, pct: 50 });
  });

  it("returns pct 0 when nothing is expected that day", () => {
    const d = new Date("2024-03-25T00:00:00");
    const stats = computeDayStats(d, { removedOccurrences: new Set(), customOccurrences: [] }, undefined);
    expect(stats).toEqual({ completed: 0, total: 0, pct: 0 });
  });
});
