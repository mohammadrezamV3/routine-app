import { describe, it, expect } from "vitest";
import { isDue, planMedicationReminders, planRoutineReminders, planExerciseReminder, zonedToUtcMs } from "@/lib/reminderPlan";

// شنبه ۲۰۲۶-۰۹-۲۶ (jsDay=6) به وقتِ تهران (UTC+3:30، بدونِ DST)
const TZ = "Asia/Tehran";
const at = (iso: string, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(zonedToUtcMs(iso, h * 60 + m, TZ));
};
const occ = [{ id: "c1", name: "مطالعه", jsDay: 6, time: "۱۰:۰۰ – ۱۱:۰۰" }];

describe("zonedToUtcMs", () => {
  it("Tehran is UTC+3:30", () => {
    expect(new Date(zonedToUtcMs("2026-09-26", 600, TZ)).toISOString()).toBe("2026-09-26T06:30:00.000Z");
  });
  it("handles DST (New York)", () => {
    expect(new Date(zonedToUtcMs("2026-07-01", 600, "America/New_York")).toISOString()).toBe("2026-07-01T14:00:00.000Z");
    expect(new Date(zonedToUtcMs("2026-12-01", 600, "America/New_York")).toISOString()).toBe("2026-12-01T15:00:00.000Z");
  });
});

describe("planRoutineReminders", () => {
  const plan = (now: Date) =>
    planRoutineReminders({ tz: TZ, now, customOccurrences: occ, removedOccurrences: new Set() }).filter((r) => isDue(r, now.getTime()));

  it("nothing before the 30-minute window", () => {
    expect(plan(at("2026-09-26", "09:29"))).toEqual([]);
  });
  it("soon reminder inside the window, with the event start as deadline", () => {
    const due = plan(at("2026-09-26", "09:30"));
    expect(due.map((r) => r.key)).toEqual(["soon:c1:2026-09-26"]);
    expect(due[0].deadline).toBe(at("2026-09-26", "10:00").getTime());
  });
  it("start reminder in the last minute before start", () => {
    expect(plan(at("2026-09-26", "09:59")).map((r) => r.key)).toEqual(["start:c1:2026-09-26"]);
  });
  it("never after start", () => {
    expect(plan(at("2026-09-26", "10:00"))).toEqual([]);
    expect(plan(at("2026-09-26", "13:00"))).toEqual([]);
  });
  it("notify=false is skipped", () => {
    const now = at("2026-09-26", "09:45");
    expect(planRoutineReminders({ tz: TZ, now, customOccurrences: [{ ...occ[0], notify: false }], removedOccurrences: new Set() })).toEqual([]);
  });
  it("tomorrow's just-after-midnight task is reminded before midnight", () => {
    const early = [{ id: "c2", name: "خواب", jsDay: 0, time: "۰۰:۱۰" }];
    const now = at("2026-09-26", "23:50");
    const due = planRoutineReminders({ tz: TZ, now, customOccurrences: early, removedOccurrences: new Set() }).filter((r) => isDue(r, now.getTime()));
    expect(due.map((r) => r.key)).toEqual(["soon:c2:2026-09-27"]);
  });
});

describe("planMedicationReminders", () => {
  const med = { id: "m1", name: "قرص", timesPerDay: 2, firstDoseTime: "08:00", startDate: "2026-09-20", durationDays: 30 };
  it("fires only in the lead window before the dose", () => {
    const due = (hhmm: string) => {
      const now = at("2026-09-26", hhmm);
      return planMedicationReminders({ tz: TZ, now, meds: [med] }).filter((r) => isDue(r, now.getTime())).map((r) => r.key);
    };
    expect(due("07:54")).toEqual([]);
    expect(due("07:56")).toEqual(["med:m1:2026-09-26:480"]);
    expect(due("08:00")).toEqual([]);
    expect(due("08:30")).toEqual([]);
  });
});

describe("planExerciseReminder", () => {
  it("due from 17:00 until local midnight", () => {
    const r1 = planExerciseReminder({ tz: TZ, now: at("2026-09-26", "16:59") });
    expect(isDue(r1, at("2026-09-26", "16:59").getTime())).toBe(false);
    const r2 = planExerciseReminder({ tz: TZ, now: at("2026-09-26", "17:00") });
    expect(isDue(r2, at("2026-09-26", "17:00").getTime())).toBe(true);
    expect(r2.deadline).toBe(at("2026-09-27", "00:00").getTime());
  });
});
