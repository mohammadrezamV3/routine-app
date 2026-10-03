import { describe, it, expect } from "vitest";
import {
  LATENCY_PRESETS, analyzeNight, bedOptions, cycleBoundaries, hypnogram, normalizeLatency, wakeOptions,
} from "@/lib/sleepCycles";

describe("چرخه‌های خواب", () => {
  it("زمان به خواب رفتن به نزدیک‌ترین گزینه برمی‌گرده", () => {
    expect(normalizeLatency(12)).toBe(10);
    expect(normalizeLatency(17)).toBe(15);
    expect(normalizeLatency(99)).toBe(30);
    expect(normalizeLatency("abc")).toBe(15);
    expect(normalizeLatency(null)).toBe(15);
    for (const p of LATENCY_PRESETS) expect(normalizeLatency(p)).toBe(p);
  });

  it("ساعت بیداری از الان: 3 تا 6 چرخه با زمان به خواب رفتن", () => {
    const w = wakeOptions(23 * 60, 15, 8 * 60);
    expect(w.map((o) => o.cycles)).toEqual([3, 4, 5, 6]);
    expect(w[0].clock).toBe("03:45");
    expect(w[3].clock).toBe("08:15");
    expect(w[3].sleepMin).toBe(540);
    // هدف 8 ساعت: 5 چرخه (450) و 6 چرخه (540) به یک اندازه دورن؟ نه: 30 در برابر 60
    expect(w.filter((o) => o.best).map((o) => o.cycles)).toEqual([5]);
  });

  it("مساوی بودن فاصله تا هدف: چرخه‌ی بیشتر برنده‌ست", () => {
    const w = wakeOptions(0, 15, 495); // وسط 450 و 540
    expect(w.filter((o) => o.best)[0].cycles).toBe(6);
  });

  it("ساعت خواب برای بیداری 07:00 و هدف 7.5 ساعت", () => {
    const b = bedOptions(7 * 60, 15, 450);
    expect(b.map((o) => o.cycles)).toEqual([6, 5, 4, 3]);
    expect(b[0].clock).toBe("21:45");
    expect(b[1].clock).toBe("23:15");
    expect(b.find((o) => o.best)!.cycles).toBe(5);
    expect(b.filter((o) => o.best)).toHaveLength(1);
  });

  it("از نیمه‌شب رد می‌شه و همیشه بین 00:00 و 23:59 می‌مونه", () => {
    for (const o of [...wakeOptions(1400, 30, 480), ...bedOptions(10, 5, 480)]) {
      expect(o.atMin).toBeGreaterThanOrEqual(0);
      expect(o.atMin).toBeLessThan(1440);
      expect(o.clock).toMatch(/^\d\d:\d\d$/);
    }
  });

  it("مرز چرخه‌ها روی پنجره‌ی هدف", () => {
    // 23:30 تا 07:00 = 450 دقیقه، زمان به خواب رفتن 15: مرزها در 105، 195، 285، 375
    const b = cycleBoundaries(23 * 60 + 30, 7 * 60, 15);
    expect(b).toHaveLength(4);
    expect(b[0]).toBe((23 * 60 + 30 + 105) % 1440);
    expect(cycleBoundaries(0, 60, 15)).toEqual([]);
  });

  it("تحلیل دیشب: نزدیک مرز خوب، وسط چرخه سنگین", () => {
    const good = analyzeNight(7 * 60 + 45, 15); // 450 = 5 چرخه دقیق
    expect(good.fullCycles).toBe(5);
    expect(good.verdict).toBe("good");
    const groggy = analyzeNight(8 * 60 + 30, 15); // 45 دقیقه داخل چرخه
    expect(groggy.fullCycles).toBe(5);
    expect(groggy.offBoundaryMin).toBe(45);
    expect(groggy.verdict).toBe("groggy");
    expect(analyzeNight(6 * 60 + 40, 15).verdict).toBe("ok");
    expect(analyzeNight(5, 15).asleepMin).toBe(0);
  });

  it("منحنی تخمینی پیوسته‌ست و به مدت خواب می‌رسه", () => {
    for (const total of [20, 95, 300, 480, 600]) {
      const segs = hypnogram(total, 15);
      expect(segs[0].from).toBe(0);
      expect(segs[segs.length - 1].to).toBe(total);
      for (let i = 1; i < segs.length; i++) expect(segs[i].from).toBe(segs[i - 1].to);
      for (const s of segs) expect(s.to).toBeGreaterThan(s.from);
    }
    expect(hypnogram(0, 15)).toEqual([]);
  });

  it("عمیق در چرخه‌های اول بیشتر و REM در آخر بیشتره", () => {
    const segs = hypnogram(6 * 90 + 15, 15);
    const sum = (stage: string, a: number, b: number) =>
      segs.filter((s) => s.stage === stage && s.from >= a && s.to <= b).reduce((x, s) => x + s.to - s.from, 0);
    expect(sum("deep", 0, 195)).toBeGreaterThan(sum("deep", 375, 555));
    expect(sum("rem", 375, 555)).toBeGreaterThan(sum("rem", 0, 195));
  });
});
