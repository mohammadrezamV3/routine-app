import { describe, it, expect } from "vitest";
import { centeredView, clampView, sourceRect, zoomAt } from "@/lib/cropMath";

const IMG = { w: 2000, h: 1000 };
const FRAME = { w: 300, h: 300 };

describe("کراپ لمسی", () => {
  it("وسط‌چین: عکس کل قاب رو می‌پوشونه", () => {
    const v = centeredView(IMG, FRAME);
    expect(v).toEqual({ zoom: 1, x: -150, y: 0 });
    expect(sourceRect(v, IMG, FRAME)).toEqual({ sx: 500, sy: 0, sw: 1000, sh: 1000 });
  });

  it("جابه‌جایی هیچ‌وقت لبه‌ی خالی نمی‌ذاره", () => {
    expect(clampView({ zoom: 1, x: 50, y: 40 }, IMG, FRAME)).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(clampView({ zoom: 1, x: -9999, y: -9999 }, IMG, FRAME)).toEqual({ zoom: 1, x: -300, y: 0 });
  });

  it("زوم حول نقطه‌ی انگشت، با سقف و کف", () => {
    const v = zoomAt(centeredView(IMG, FRAME), 2, 150, 150, IMG, FRAME);
    expect(v.zoom).toBe(2);
    // نقطه‌ی وسط قاب همون نقطه‌ی عکس می‌مونه
    const r = sourceRect(v, IMG, FRAME);
    expect(r.sx + r.sw / 2).toBeCloseTo(1000);
    expect(r.sy + r.sh / 2).toBeCloseTo(500);
    expect(zoomAt(v, 99, 0, 0, IMG, FRAME).zoom).toBe(5);
    expect(zoomAt(v, 0.1, 0, 0, IMG, FRAME).zoom).toBe(1);
  });
});
