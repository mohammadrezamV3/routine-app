import { describe, it, expect } from "vitest";
import { parseIsoDate } from "@/lib/validate";

// روزِ ثبت = UTC نیمه‌شبِ همون روز؛ خروجی با getUTC* همون روز رو می‌ده، در هر TZ.
describe("sleep date column round trip", () => {
  for (const tz of ["Asia/Tehran", "America/New_York", "Pacific/Auckland", "Pacific/Honolulu"]) {
    it(`wake instant within 2 days of date in ${tz}`, () => {
      const prev = process.env.TZ; process.env.TZ = tz;
      try {
        const d = parseIsoDate("2026-03-10")!;
        expect(d.toISOString()).toBe("2026-03-10T00:00:00.000Z");
        for (const hhmm of ["00:00", "07:00", "23:59"]) {
          const [h, m] = hhmm.split(":").map(Number);
          const woke = new Date(2026, 2, 10, h, m);
          expect(Math.abs(woke.getTime() - d.getTime())).toBeLessThanOrEqual(2 * 86_400_000);
        }
      } finally { if (prev === undefined) delete process.env.TZ; else process.env.TZ = prev; }
    });
  }
});
