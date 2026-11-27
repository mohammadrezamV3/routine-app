import { describe, it, expect } from "vitest";
import {
  LEGACY_ROUTINE_TRIAL_DAYS, LEGACY_TRIAL_DAYS, ROUTINE_TRIAL_MS, TRIAL_CUTOFF_AT, TRIAL_MS, routineTrialMsFor, trialMsFor,
} from "@/lib/trial";

const DAY = 86_400_000;

describe("trial length cutoff", () => {
  it("accounts created before the cutoff keep the old trial lengths", () => {
    const before = new Date(TRIAL_CUTOFF_AT.getTime() - 1);
    expect(trialMsFor(before)).toBe(LEGACY_TRIAL_DAYS * DAY);
    expect(routineTrialMsFor(before)).toBe(LEGACY_ROUTINE_TRIAL_DAYS * DAY);
    expect(LEGACY_TRIAL_DAYS).toBe(3);
    expect(LEGACY_ROUTINE_TRIAL_DAYS).toBe(14);
  });

  it("accounts created at or after the cutoff get the new 7-day trial", () => {
    expect(trialMsFor(TRIAL_CUTOFF_AT)).toBe(TRIAL_MS);
    expect(routineTrialMsFor(TRIAL_CUTOFF_AT.toISOString())).toBe(ROUTINE_TRIAL_MS);
    expect(TRIAL_MS).toBe(7 * DAY);
    expect(ROUTINE_TRIAL_MS).toBe(7 * DAY);
  });
});
