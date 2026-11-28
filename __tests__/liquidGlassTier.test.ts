import { describe, expect, it } from "vitest";
import { capGlassTier, selectGlassTier, DEFAULT_GLASS_TIER, type GlassCaps } from "@/lib/liquidGlassTier";
import { glassMapPixel } from "@/lib/liquidGlassMap";

const strong: GlassCaps = { perfWeak: false, reducedTransparency: false, saveData: false, deviceMemory: 8, cores: 12, hasBackdropFilter: true, svgBackdrop: true, hoverFine: true };

describe("selectGlassTier", () => {
  it("ssr default is the cheapest tier", () => expect(DEFAULT_GLASS_TIER).toBe("static"));
  it("chromium desktop gets full regardless of memory/cores", () => {
    expect(selectGlassTier(strong)).toBe("full");
    expect(selectGlassTier({ ...strong, deviceMemory: 4, cores: 4 })).toBe("full");
  });
  it("safari/firefox desktop (no svg backdrop) gets lite", () => expect(selectGlassTier({ ...strong, svgBackdrop: false })).toBe("lite"));
  it("every phone/tablet gets lite, even weak or low memory", () => {
    expect(selectGlassTier({ ...strong, hoverFine: false })).toBe("lite");
    expect(selectGlassTier({ ...strong, mobile: true })).toBe("lite");
    expect(selectGlassTier({ ...strong, mobile: true, perfWeak: true, deviceMemory: 2, saveData: true })).toBe("lite");
  });
  it("weak or save-data desktop drops full to lite, not static", () => {
    expect(selectGlassTier({ ...strong, perfWeak: true })).toBe("lite");
    expect(selectGlassTier({ ...strong, saveData: true })).toBe("lite");
  });
  it.each([
    ["reduced transparency", { reducedTransparency: true }],
    ["no backdrop-filter", { hasBackdropFilter: false }],
  ])("%s forces static (even on mobile)", (_n, o) => {
    expect(selectGlassTier({ ...strong, ...o })).toBe("static");
    expect(selectGlassTier({ ...strong, mobile: true, ...o })).toBe("static");
  });
});

describe("glassMapPixel", () => {
  const p = { w: 200, h: 100, radius: 30, bezel: 20 };
  it("center is neutral", () => expect(glassMapPixel(100, 50, p)).toEqual([128, 128]));
  it("left edge samples from the inside (R above neutral), right edge opposite", () => {
    expect(glassMapPixel(1, 50, p)[0]).toBeGreaterThan(128);
    expect(glassMapPixel(198, 50, p)[0]).toBeLessThan(128);
    expect(glassMapPixel(1, 50, p)[1]).toBe(128);
  });
  it("top edge samples downward", () => expect(glassMapPixel(100, 1, p)[1]).toBeGreaterThan(128));
  it("displacement decays toward the inside", () => {
    const e = glassMapPixel(1, 50, p)[0] - 128;
    const m = glassMapPixel(10, 50, p)[0] - 128;
    expect(e).toBeGreaterThan(m);
  });
});

describe("capGlassTier", () => {
  it("caps full to lite", () => expect(capGlassTier("full", "lite")).toBe("lite"));
  it("never raises a lower tier", () => { expect(capGlassTier("static", "lite")).toBe("static"); expect(capGlassTier("lite", "full")).toBe("lite"); });
  it("no max keeps tier", () => expect(capGlassTier("full", undefined)).toBe("full"));
});

import { bucketSize, glassFilterKey, mapDims } from "@/lib/glassFilterBuckets";
describe("glass filter buckets", () => {
  it("rounds up to 32px buckets", () => { expect(bucketSize(1)).toBe(32); expect(bucketSize(33)).toBe(64); expect(bucketSize(320)).toBe(320); });
  it("near sizes share a key", () => expect(glassFilterKey(300, 200, 22, "subtle")).toBe(glassFilterKey(310, 210, 22, "subtle")));
  it("map is capped and keeps aspect", () => { const d = mapDims(1344, 448); expect(Math.max(d.w, d.h)).toBeLessThanOrEqual(192); expect(d.w / d.h).toBeCloseTo(3, 0); });
});
