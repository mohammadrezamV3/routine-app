import { describe, expect, it } from "vitest";
import {
  FOREX_SESSIONS, isForexOpen, localMinutesToInstant, nextSessionOpen,
  sessionArcs, upcomingSession, wallClockIn,
} from "@/lib/forexSessions";

// این تست‌ها اهمیتشان این است که خطاشان **دیده نمی‌شود**: یک کمانِ یک‌ساعت
// جابه‌جا روی ساعت کاملاً طبیعی به‌نظر می‌رسد و فقط دو بار در سال غلط است.

describe("localMinutesToInstant", () => {
  it("لحظه‌ای می‌دهد که ساعتِ محلیِ آن شهر دقیقاً همان مقدار است", () => {
    for (const tz of ["Europe/London", "America/New_York", "Asia/Tokyo", "Australia/Sydney"]) {
      for (const target of [0, 8 * 60, 16 * 60 + 30, 23 * 60 + 59]) {
        const got = localMinutesToInstant(new Date("2026-06-15T12:00:00Z"), tz, target);
        expect(wallClockIn(got, tz).minutes, `${tz} @ ${target}`).toBe(target);
      }
    }
  });

  it("روی روزِ تغییرِ ساعتِ لندن هم درست است (پاسِ اصلاح)", () => {
    // ۲۰۲۶-۱۰-۲۵ لندن ساعت را عقب می‌کشد
    for (const iso of ["2026-10-24T20:00:00Z", "2026-10-25T02:00:00Z", "2026-10-25T20:00:00Z"]) {
      const got = localMinutesToInstant(new Date(iso), "Europe/London", 8 * 60);
      expect(wallClockIn(got, "Europe/London").minutes, iso).toBe(480);
    }
  });

  it("روی روزِ تغییرِ ساعتِ سیدنی هم درست است (نیم‌کره‌ی جنوبی، برعکس)", () => {
    for (const iso of ["2026-04-04T12:00:00Z", "2026-04-05T12:00:00Z", "2026-10-04T12:00:00Z"]) {
      const got = localMinutesToInstant(new Date(iso), "Australia/Sydney", 7 * 60);
      expect(wallClockIn(got, "Australia/Sydney").minutes, iso).toBe(420);
    }
  });

  it("نزدیک‌ترین رخداد را می‌گیرد، نه همیشه رو به جلو", () => {
    const ref = new Date("2026-06-15T12:00:00Z"); // ۱۳:۰۰ لندن
    const got = localMinutesToInstant(ref, "Europe/London", 12 * 60);
    // ۱۲:۰۰ همین امروز، یعنی یک ساعت *قبل* — نه فردا
    expect(got.getTime()).toBeLessThan(ref.getTime());
    expect(ref.getTime() - got.getTime()).toBe(3600_000);
  });
});

describe("sessionArcs", () => {
  const arcs = sessionArcs(new Date("2026-06-15T12:00:00Z")); // دوشنبه

  it("هر چهار جلسه را می‌دهد", () => {
    expect(arcs.map((a) => a.key).sort()).toEqual(["LONDON", "NEWYORK", "SYDNEY", "TOKYO"]);
  });

  it("طولِ کمان‌ها با تعریفِ جلسه‌ها می‌خواند", () => {
    const by = Object.fromEntries(arcs.map((a) => [a.key, a]));
    expect(by.SYDNEY.durationMin).toBe(9 * 60);        // ۰۷:۰۰–۱۶:۰۰
    expect(by.TOKYO.durationMin).toBe(9 * 60);         // ۰۹:۰۰–۱۸:۰۰
    expect(by.LONDON.durationMin).toBe(8 * 60 + 30);   // ۰۸:۰۰–۱۶:۳۰
    expect(by.NEWYORK.durationMin).toBe(9 * 60);       // ۰۸:۰۰–۱۷:۰۰
  });

  it("هیچ کمانی صفر یا بیشتر از یک شبانه‌روز نیست", () => {
    for (const a of arcs) {
      expect(a.durationMin).toBeGreaterThan(0);
      expect(a.durationMin).toBeLessThan(1440);
      expect(a.startMin).toBeGreaterThanOrEqual(0);
      expect(a.startMin).toBeLessThan(1440);
    }
  });

  it("closeAt واقعاً برابرِ openAt به‌علاوه‌ی طول است", () => {
    for (const a of arcs) {
      expect(a.closeAt.getTime() - a.openAt.getTime()).toBe(a.durationMin * 60_000);
    }
  });

  it("در زمستان هم طول‌ها ثابت می‌مانند (یعنی DST درست جابه‌جا شده)", () => {
    const winter = sessionArcs(new Date("2026-01-15T12:00:00Z"));
    const by = Object.fromEntries(winter.map((a) => [a.key, a]));
    expect(by.LONDON.durationMin).toBe(8 * 60 + 30);
    expect(by.NEWYORK.durationMin).toBe(9 * 60);
  });
});

describe("nextSessionOpen / upcomingSession", () => {
  it("همیشه لحظه‌ای در آینده می‌دهد", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    for (const k of ["SYDNEY", "TOKYO", "LONDON", "NEWYORK"] as const) {
      const at = nextSessionOpen(k, now)!;
      expect(at.getTime(), k).toBeGreaterThan(now.getTime());
    }
  });

  it("آخرِ هفته را رد می‌کند — بازشدنِ بعدی هیچ‌وقت آخرِ هفته‌ی خودِ آن شهر نیست", () => {
    // جمعه شب، بعد از بسته‌شدنِ بازار
    const fridayNight = new Date("2026-06-19T22:00:00Z");
    for (const k of ["SYDNEY", "TOKYO", "LONDON", "NEWYORK"] as const) {
      const at = nextSessionOpen(k, fridayNight)!;
      const tz = FOREX_SESSIONS.find((s) => s.key === k)!.tz;
      const wd = wallClockIn(at, tz).weekday;
      expect([0, 6], `${k} → ${at.toISOString()}`).not.toContain(wd);
      // و آن لحظه بازارِ فارکس هم واقعاً باز است
      expect(isForexOpen(at), `${k} بازار`).toBe(true);
    }
  });

  it("جلسه‌ی بازِ فعلی را به‌عنوانِ «بعدی» پیشنهاد نمی‌دهد", () => {
    const now = new Date("2026-06-15T12:00:00Z"); // لندن باز است
    const next = upcomingSession(now);
    expect(next?.key).not.toBe("LONDON");
  });

  it("در آخرِ هفته هم چیزی برمی‌گرداند و null نمی‌شود", () => {
    const saturday = new Date("2026-06-20T12:00:00Z");
    expect(nextSessionOpen("LONDON", saturday)).not.toBeNull();
  });
});
