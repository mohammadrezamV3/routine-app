import { describe, expect, it } from "vitest";
import { selectGlassTier, DEFAULT_GLASS_TIER, type GlassCaps } from "@/lib/liquidGlassTier";
import { glassMapPixel } from "@/lib/liquidGlassMap";

const strong: GlassCaps = { perfWeak: false, reducedTransparency: false, saveData: false, deviceMemory: 8, cores: 12, hasBackdropFilter: true, svgBackdrop: true, hoverFine: true };

describe("selectGlassTier", () => {
  it("ssr default is the cheapest tier", () => expect(DEFAULT_GLASS_TIER).toBe("static"));
  it("strong chromium desktop gets full", () => expect(selectGlassTier(strong)).toBe("full"));
  it("safari/firefox (no svg backdrop) gets lite", () => expect(selectGlassTier({ ...strong, svgBackdrop: false, deviceMemory: undefined })).toBe("lite"));
  it("touch device gets lite, not full", () => expect(selectGlassTier({ ...strong, hoverFine: false })).toBe("lite"));
  it("mid chromium (4-core) gets lite", () => expect(selectGlassTier({ ...strong, cores: 4 })).toBe("lite"));
  it.each([
    ["perf-weak", { perfWeak: true }],
    ["reduced transparency", { reducedTransparency: true }],
    ["save-data", { saveData: true }],
    ["low memory", { deviceMemory: 4 }],
    ["no backdrop-filter", { hasBackdropFilter: false }],
  ])("%s forces static", (_n, o) => expect(selectGlassTier({ ...strong, ...o })).toBe("static"));
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
