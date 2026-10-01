import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { shouldTouch, TOUCH_INTERVAL_MS } from "@/lib/deviceSessions";
import { formatTehranDateTime, latestDate } from "@/lib/tehranTime";

describe("آخرین بازدید", () => {
  it("throttle: اولین بار و بعد از یک دقیقه می‌نویسد، وسطش نه", () => {
    expect(shouldTouch(undefined, 1000)).toBe(true);
    expect(shouldTouch(1000, 1000 + TOUCH_INTERVAL_MS - 1)).toBe(false);
    expect(shouldTouch(1000, 1000 + TOUCH_INTERVAL_MS)).toBe(true);
  });

  it("زمان به وقت تهران و با ارقام انگلیسی", () => {
    expect(formatTehranDateTime("2026-09-23T20:30:00Z")).toBe("2 مهر · 00:00");
    expect(formatTehranDateTime("2026-09-24T10:37:00Z")).toBe("2 مهر · 14:07");
    expect(formatTehranDateTime("bad")).toBe("—");
    expect(formatTehranDateTime(null)).toBe("—");
  });

  it("latestDate دیرترین را برمی‌گرداند", () => {
    expect(latestDate(null, "2026-01-01T00:00:00Z", new Date("2026-02-01T00:00:00Z"))?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(latestDate(null, undefined)).toBeNull();
  });
});
