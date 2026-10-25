import { describe, it, expect } from "vitest";
import { sanitizeProgramDraft, sanitizeSuggestions, sanitizeWeekSummary } from "@/lib/coachNomo";

describe("coach nomo sanitizers", () => {
  it("clamps program draft", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ title: `t${i}`, days: [0, 9, 2, 2, -1], sets: 500, reps: 10, durationMin: 30, startTime: i ? "25:00" : "07:30" }));
    const d = sanitizeProgramDraft({ title: "P", weeks: 99, items }, "WORKOUT");
    expect(d?.items).toHaveLength(30);
    expect(d?.weeks).toBe(12);
    expect(d?.items[0].days).toEqual([0, 2]);
    expect(d?.items[0].sets).toBeNull();
    expect(d?.items[0].reps).toBe(10);
    expect(d?.items[0].startTime).toBe("07:30");
    expect(d?.items[1].startTime).toBeNull();
  });
  it("routine drops sets/reps; invalid -> null", () => {
    const d = sanitizeProgramDraft({ title: "R", items: [{ title: "a", days: [1], sets: 3, reps: 3 }] }, "ROUTINE");
    expect(d?.items[0].sets).toBeNull();
    expect(sanitizeProgramDraft({ title: "", items: [] }, "ROUTINE")).toBeNull();
    expect(sanitizeProgramDraft({ title: "x", items: [{ title: "a", days: [] }] }, "ROUTINE")).toBeNull();
  });
  it("summary and suggestions", () => {
    expect(sanitizeWeekSummary({ lines: ["a", "b", "c", "d"] })).toBe("a\nb\nc");
    expect(sanitizeWeekSummary({ lines: [] })).toBeNull();
    expect(sanitizeSuggestions({ suggestions: ["x", " ", "y"] })).toEqual(["x", "y"]);
    expect(sanitizeSuggestions({})).toBeNull();
  });
});
