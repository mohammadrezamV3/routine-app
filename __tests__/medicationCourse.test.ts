import { describe, it, expect } from "vitest";
import { Medication, hasMedicationCourse, isMedicationActiveOn, medicationEndDate } from "@/lib/medicationSchedule";
import { medicationDaysLeft } from "@/lib/medications";
import { validateSettingNumbers } from "@/lib/settingValueLimits";
import { planMedicationReminders } from "@/lib/reminderPlan";

const base: Medication = { id: "m", name: "x", timesPerDay: 2, firstDoseTime: "08:00", startDate: "2026-09-20" };

describe("medication without a course", () => {
  it("has no course or end date and stays active forever after start", () => {
    expect(hasMedicationCourse(base)).toBe(false);
    expect(hasMedicationCourse({ durationDays: null })).toBe(false);
    expect(medicationEndDate(base)).toBeNull();
    expect(isMedicationActiveOn(base, "2026-09-19")).toBe(false);
    expect(isMedicationActiveOn(base, "2026-09-20")).toBe(true);
    expect(isMedicationActiveOn(base, "2030-01-01")).toBe(true);
    expect(medicationDaysLeft(base, "2027-01-01")).toBeNull();
  });
  it("with a course still ends", () => {
    const m = { ...base, durationDays: 3 };
    expect(medicationEndDate(m)).toBe("2026-09-22");
    expect(isMedicationActiveOn(m, "2026-09-23")).toBe(false);
    expect(medicationDaysLeft(m, "2026-09-21")).toBe(2);
    expect(medicationDaysLeft(m, "2026-10-01")).toBe(0);
  });
  it("server validation accepts missing/null duration and rejects bad ones", () => {
    expect(validateSettingNumbers("medications", [{ timesPerDay: 3 }]).ok).toBe(true);
    const r = validateSettingNumbers("medications", [{ timesPerDay: 3, durationDays: null }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect("durationDays" in (r.value as Record<string, unknown>[])[0]).toBe(false);
    expect(validateSettingNumbers("medications", [{ timesPerDay: 3, durationDays: 0 }]).ok).toBe(false);
    expect(validateSettingNumbers("medications", [{ timesPerDay: 3, durationDays: 999 }]).ok).toBe(false);
  });
  it("still plans reminders long after start", () => {
    const out = planMedicationReminders({ tz: "Asia/Tehran", now: new Date("2027-03-01T05:00:00Z"), meds: [base] });
    expect(out.length).toBeGreaterThan(0);
  });
});
