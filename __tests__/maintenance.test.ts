import { describe, it, expect } from "vitest";
import { isMaintenanceActive, maintenanceDismissKey, normalizeMaintenance, parseMaintenanceInput, MAINTENANCE_MESSAGE_MAX } from "@/lib/maintenance";

const NOW = new Date("2026-10-07T10:00:00Z");

describe("maintenance", () => {
  it("normalizes junk to disabled", () => {
    expect(normalizeMaintenance(null)).toEqual({ enabled: false, message: "", until: null });
    expect(normalizeMaintenance({ enabled: "yes", message: 5, until: "bad" })).toEqual({ enabled: false, message: "", until: null });
  });
  it("requires a message when enabling and caps length", () => {
    expect(parseMaintenanceInput({ enabled: true, message: " " }).ok).toBe(false);
    expect(parseMaintenanceInput({ enabled: true, message: "x".repeat(MAINTENANCE_MESSAGE_MAX + 1) }).ok).toBe(false);
    expect(parseMaintenanceInput({ enabled: false, message: "" }).ok).toBe(true);
    expect(parseMaintenanceInput({ enabled: true, message: "ok", until: "nope" }).ok).toBe(false);
  });
  it("auto-expires at until", () => {
    const s = { enabled: true, message: "m", until: "2026-10-07T09:00:00.000Z" };
    expect(isMaintenanceActive(s, NOW)).toBe(false);
    expect(isMaintenanceActive({ ...s, until: "2026-10-07T11:00:00.000Z" }, NOW)).toBe(true);
    expect(isMaintenanceActive({ ...s, until: null }, NOW)).toBe(true);
    expect(isMaintenanceActive({ ...s, enabled: false }, NOW)).toBe(false);
  });
  it("dismiss key changes with the message", () => {
    const a = maintenanceDismissKey({ enabled: true, message: "a", until: null });
    const b = maintenanceDismissKey({ enabled: true, message: "b", until: null });
    expect(a).not.toBe(b);
  });
});
