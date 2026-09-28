import { describe, expect, it } from "vitest";
import { isTaskTimePassed } from "@/lib/schedule";

// 2026-09-27 10:30 local
const now = new Date(2026, 8, 27, 10, 30);

describe("isTaskTimePassed", () => {
  it("past day is always passed, future day never", () => {
    expect(isTaskTimePassed("2026-09-26", "۲۲:۰۰ – ۲۳:۰۰", now)).toBe(true);
    expect(isTaskTimePassed("2026-09-26", "", now)).toBe(true);
    expect(isTaskTimePassed("2026-09-28", "۰۱:۰۰", now)).toBe(false);
  });
  it("today: uses the end of a Persian-digit range", () => {
    expect(isTaskTimePassed("2026-09-27", "۰۶:۰۰ – ۰۶:۴۵", now)).toBe(true);
    expect(isTaskTimePassed("2026-09-27", "۱۰:۰۰ – ۱۱:۰۰", now)).toBe(false);
    expect(isTaskTimePassed("2026-09-27", "10:00-10:30", now)).toBe(true);
  });
  it("today: single time and untimed", () => {
    expect(isTaskTimePassed("2026-09-27", "۰۹:۰۰", now)).toBe(true);
    expect(isTaskTimePassed("2026-09-27", "۱۲:۰۰", now)).toBe(false);
    expect(isTaskTimePassed("2026-09-27", "", now)).toBe(false);
  });
  it("range crossing midnight is not passed today", () => {
    expect(isTaskTimePassed("2026-09-27", "۰۹:۰۰ – ۰۱:۰۰", now)).toBe(false);
  });
});
