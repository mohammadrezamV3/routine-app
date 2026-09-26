import { describe, expect, it } from "vitest";
import { dateKeyToIso, hhmmToIso, isoToDateKey, isoToHhmm, numToPriority, priorityToNum, toChange } from "./mappers";
import { deviceNameFromUA } from "./deviceName";

describe("mappers", () => {
  it("HH:mm ↔ ISO (ساعتِ محلی) رفت‌وبرگشت", () => {
    const iso = hhmmToIso("2026-09-25", "23:15")!;
    expect(iso).toMatch(/Z$/);
    expect(isoToHhmm(iso)).toBe("23:15");
  });
  it("dueDate ↔ ISOِ نیمه‌شبِ UTC", () => {
    expect(dateKeyToIso("2026-09-25")).toBe("2026-09-25T00:00:00.000Z");
    expect(isoToDateKey("2026-09-25T00:00:00.000Z")).toBe("2026-09-25");
  });
  it("priority", () => {
    expect(["low", "medium", "high"].map((p) => numToPriority(priorityToNum(p as any)))).toEqual(["low", "medium", "high"]);
    expect(numToPriority(7)).toBe("high");
  });
  it("تنظیماتِ غیرِ فاز ۱ push نمی‌شن؛ value=null → delete", () => {
    expect(toChange("settings", { key: "localOnly", value: 1, updatedAt: "x", deletedAt: null, dirty: 1 })).toBeNull();
    expect(toChange("settings", { key: "outingDates", value: null, updatedAt: "x", deletedAt: null, dirty: 1 })).toMatchObject({ op: "delete" });
  });
  it("deviceName از userAgentِ اندروید", () => {
    const ua = "Mozilla/5.0 (Linux; Android 14; SM-A525F Build/UP1A.231005.007; wv) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36";
    expect(deviceNameFromUA(ua)).toBe("SM-A525F · Android 14");
  });
});
