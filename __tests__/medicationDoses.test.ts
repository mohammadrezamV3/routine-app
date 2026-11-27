import { describe, it, expect } from "vitest";
import { dosesOnDay, doseKey, nextPendingDose, toggleDose } from "@/lib/medicationDoses";
import type { Medication } from "@/lib/medicationSchedule";

const med = (o: Partial<Medication> = {}): Medication => ({
  id: "m1", name: "A", timesPerDay: 2, firstDoseTime: "08:00", startDate: "2026-11-20", durationDays: 10, ...o,
});

describe("medicationDoses", () => {
  it("lists doses of active medications in time order", () => {
    const slots = dosesOnDay([med(), med({ id: "m2", name: "B", timesPerDay: 1, firstDoseTime: "09:30" })], "2026-11-25");
    expect(slots.map((s) => s.time)).toEqual(["08:00", "09:30", "20:00"]);
  });
  it("skips medications outside their course", () => {
    expect(dosesOnDay([med()], "2026-12-30")).toEqual([]);
    expect(dosesOnDay([med()], "2026-11-19")).toEqual([]);
  });
  it("toggles a dose and prunes old days", () => {
    const k = doseKey("m1", 480);
    let log = toggleDose({ "2026-01-01": ["x@08:00"] }, "2026-11-25", k);
    expect(log["2026-11-25"]).toEqual([k]);
    expect(log["2026-01-01"]).toBeUndefined();
    log = toggleDose(log, "2026-11-25", k);
    expect(log["2026-11-25"]).toBeUndefined();
  });
  it("picks the next pending dose", () => {
    const slots = dosesOnDay([med()], "2026-11-25");
    expect(nextPendingDose(slots, [], 600)?.time).toBe("20:00");
    expect(nextPendingDose(slots, [slots[1].key], 600)?.time).toBe("08:00");
    expect(nextPendingDose(slots, slots.map((s) => s.key), 600)).toBeNull();
  });
});
