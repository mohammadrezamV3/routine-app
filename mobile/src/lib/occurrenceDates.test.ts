import { describe, expect, it } from "vitest";
import { datesForEditedOccurrence, datesForNewOccurrence, firstOccurrenceIso } from "./occurrenceDates";
import { isoLocal } from "./jalali";
import { sameWeekIso } from "./schedule";

describe("datesForNewOccurrence", () => {
  const today = "2024-03-25";

  it("weekly (default): only startDate=today, no endDate", () => {
    expect(
      datesForNewOccurrence({ today, isOnce: false, onceIso: today, isPeriod: false, periodStartIso: null, periodEndIso: null })
    ).toEqual({ startDate: today });
  });

  it("once: startDate = endDate = the chosen day", () => {
    expect(
      datesForNewOccurrence({ today, isOnce: true, onceIso: "2024-04-01", isPeriod: false, periodStartIso: null, periodEndIso: null })
    ).toEqual({ startDate: "2024-04-01", endDate: "2024-04-01" });
  });

  it("period: startDate/endDate = the chosen range", () => {
    expect(
      datesForNewOccurrence({
        today,
        isOnce: false,
        onceIso: today,
        isPeriod: true,
        periodStartIso: "2024-04-01",
        periodEndIso: "2024-04-10",
      })
    ).toEqual({ startDate: "2024-04-01", endDate: "2024-04-10" });
  });

  it("period without both dates chosen yet falls back to weekly (caller validates before this)", () => {
    expect(
      datesForNewOccurrence({ today, isOnce: false, onceIso: today, isPeriod: true, periodStartIso: "2024-04-01", periodEndIso: null })
    ).toEqual({ startDate: today });
  });
});

describe("datesForEditedOccurrence", () => {
  const today = "2024-03-25"; // Monday, jsDay=1

  it("one-off (startDate===endDate): moves to the same-week date of the new jsDay", () => {
    const orig = { startDate: "2024-03-23", endDate: "2024-03-23" }; // Saturday jsDay=6
    const result = datesForEditedOccurrence({ today, jsDay: 0, orig, sameWeekIso }); // move to Sunday
    const expectedIso = sameWeekIso("2024-03-23", 0);
    expect(result).toEqual({ startDate: expectedIso, endDate: expectedIso });
  });

  it("past period (endDate < today) is left untouched", () => {
    const orig = { startDate: "2024-01-01", endDate: "2024-02-01" };
    expect(datesForEditedOccurrence({ today, jsDay: 1, orig, sameWeekIso })).toEqual({
      startDate: "2024-01-01",
      endDate: "2024-02-01",
    });
  });

  it("current/future period keeps its endDate and never pushes startDate before today", () => {
    const orig = { startDate: "2024-01-01", endDate: "2024-12-31" };
    expect(datesForEditedOccurrence({ today, jsDay: 1, orig, sameWeekIso })).toEqual({
      startDate: today,
      endDate: "2024-12-31",
    });
  });

  it("future-dated weekly startDate (not yet started) is preserved, not reset to today", () => {
    const orig = { startDate: "2024-04-01" };
    expect(datesForEditedOccurrence({ today, jsDay: 1, orig, sameWeekIso })).toEqual({ startDate: "2024-04-01" });
  });

  it("plain weekly (no endDate, startDate in the past) resets startDate to today, drops endDate", () => {
    const orig = { startDate: "2024-01-01" };
    expect(datesForEditedOccurrence({ today, jsDay: 1, orig, sameWeekIso })).toEqual({ startDate: today });
  });

  it("no orig at all still resets to a plain weekly starting today", () => {
    expect(datesForEditedOccurrence({ today, jsDay: 1, orig: undefined, sameWeekIso })).toEqual({ startDate: today });
  });
});

describe("firstOccurrenceIso", () => {
  it("finds the next occurrence of a weekday on/after today, within [start,end]", () => {
    const today = "2024-03-25"; // Monday jsDay=1
    const iso = firstOccurrenceIso(3 /* Wednesday */, { startDate: today }, today, isoLocal);
    expect(iso).toBe("2024-03-27");
  });

  it("returns null when that weekday only occurs after the period's endDate", () => {
    const today = "2024-03-25";
    const iso = firstOccurrenceIso(3, { startDate: today, endDate: "2024-03-26" }, today, isoLocal);
    expect(iso).toBeNull();
  });

  it("starts searching from startDate when it is in the future", () => {
    const today = "2024-03-25";
    const iso = firstOccurrenceIso(1 /* Monday */, { startDate: "2024-04-01" }, today, isoLocal);
    expect(iso).toBe("2024-04-01");
  });
});
