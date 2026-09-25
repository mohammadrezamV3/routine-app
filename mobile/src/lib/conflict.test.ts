import { describe, expect, it } from "vitest";
import { findConflictOnDate, rangesOverlap } from "./conflict";

describe("rangesOverlap", () => {
  it("detects overlap including a null end (treated as +1 minute)", () => {
    expect(rangesOverlap(600, 660, 630, 690)).toBe(true);
    expect(rangesOverlap(600, 660, 660, 720)).toBe(false);
    expect(rangesOverlap(600, null, 600, null)).toBe(true);
  });
});

describe("findConflictOnDate", () => {
  const opts = {
    removedOccurrences: new Set<string>(),
    customOccurrences: [{ id: "a", name: "کلاسِ ریاضی", jsDay: new Date("2024-03-25T00:00:00").getDay(), time: "۱۰:۰۰ – ۱۲:۰۰" }],
  };

  it("finds a conflicting occurrence overlapping the given range", () => {
    const conflict = findConflictOnDate(new Date("2024-03-25T00:00:00"), 11 * 60, 13 * 60, opts);
    expect(conflict?.id).toBe("a");
  });

  it("excludes the occurrence being edited via excludeId", () => {
    const conflict = findConflictOnDate(new Date("2024-03-25T00:00:00"), 11 * 60, 13 * 60, opts, "a");
    expect(conflict).toBeNull();
  });

  it("returns null when ranges don't overlap", () => {
    const conflict = findConflictOnDate(new Date("2024-03-25T00:00:00"), 13 * 60, 14 * 60, opts);
    expect(conflict).toBeNull();
  });
});
