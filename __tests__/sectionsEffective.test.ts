import { describe, it, expect } from "vitest";
import {
  SECTION_COOKIE,
  SECTION_COOKIE_MAX_AGE,
  resolveEffectiveSection,
  sectionToSwitchTo,
  serializeSectionCookie,
} from "@/lib/sections";

describe("resolveEffectiveSection", () => {
  it("valid cookie wins over the host section", () => {
    expect(resolveEffectiveSection("trade", "workout")).toBe("workout");
    expect(resolveEffectiveSection(null, "routine")).toBe("routine");
  });

  it("falls back to the host section without a cookie", () => {
    expect(resolveEffectiveSection("trade", undefined)).toBe("trade");
    expect(resolveEffectiveSection("routine", null)).toBe("routine");
    expect(resolveEffectiveSection(null, undefined)).toBeNull();
  });

  it("ignores invalid cookie values", () => {
    expect(resolveEffectiveSection("trade", "")).toBe("trade");
    expect(resolveEffectiveSection("trade", "Workout")).toBe("trade");
    expect(resolveEffectiveSection(null, "admin")).toBeNull();
  });
});

describe("sectionToSwitchTo", () => {
  it("returns null for shared paths, own paths and the all-sections view", () => {
    expect(sectionToSwitchTo("trade", "/dashboard")).toBeNull();
    expect(sectionToSwitchTo("trade", "/trade/journal")).toBeNull();
    expect(sectionToSwitchTo("workout", "/sleep")).toBeNull();
    expect(sectionToSwitchTo(null, "/exercise")).toBeNull();
  });

  it("returns the first owner for a path owned by another section", () => {
    expect(sectionToSwitchTo("routine", "/trade/journal")).toBe("trade");
    expect(sectionToSwitchTo("trade", "/exercise")).toBe("workout");
    expect(sectionToSwitchTo("trade", "/sleep")).toBe("routine");
  });
});

describe("serializeSectionCookie", () => {
  it("is host-only (no Domain), a year long, Lax", () => {
    const c = serializeSectionCookie("trade", false);
    expect(c).toBe(`${SECTION_COOKIE}=trade; Path=/; Max-Age=${SECTION_COOKIE_MAX_AGE}; SameSite=Lax`);
    expect(c.toLowerCase()).not.toContain("domain");
    expect(SECTION_COOKIE_MAX_AGE).toBe(31536000);
  });

  it("adds Secure on https", () => {
    expect(serializeSectionCookie("workout", true)).toMatch(/; Secure$/);
  });
});
