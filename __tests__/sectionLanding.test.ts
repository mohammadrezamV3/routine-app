import { describe, expect, it } from "vitest";
import { SECTION_KEYS } from "@/lib/sections";
import {
  SECTION_BENTO_KEYS, SECTION_FEATURE_KEYS, SECTION_SHOWCASE_KEYS, getSectionCopy, getSectionHero, getSectionSeo,
} from "@/lib/sectionLanding";
import { getFaqItems } from "@/lib/landingFaq";
import { ROUTINE_MONTHLY_TOKEN } from "@/lib/planPricing";

// اعراب (کسره، فتحه، ضمه، تنوین، تشدید، سکون، همزه بالا) و «أ» «إ» نباید در متن باشند
const BAD = /[ً-ْٰأإ]/;

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe("section landing copy", () => {
  it("every section has complete seo, hero and copy without diacritics", () => {
    for (const k of SECTION_KEYS) {
      const all = [getSectionSeo(k), getSectionHero(k, "آریون"), getSectionCopy(k), getFaqItems(k)];
      for (const s of strings(all)) {
        expect(s.length).toBeGreaterThan(0);
        expect(BAD.test(s), s).toBe(false);
      }
    }
  });

  it("titles are distinct and descriptions have a sensible length", () => {
    const titles = SECTION_KEYS.map((k) => getSectionSeo(k).title);
    expect(new Set(titles).size).toBe(SECTION_KEYS.length);
    for (const k of SECTION_KEYS) {
      const d = getSectionSeo(k).description;
      expect(d.length).toBeGreaterThan(80);
      expect(d.length).toBeLessThan(330);
      expect(getSectionSeo(k).keywords.length).toBeGreaterThan(6);
    }
  });

  it("faq is section-specific and keeps the price placeholder mechanism", () => {
    const apex = getFaqItems(null).map((f) => f.q);
    for (const k of SECTION_KEYS) {
      const items = getFaqItems(k);
      expect(items.length).toBeGreaterThanOrEqual(6);
      expect(items.map((f) => f.q)).not.toEqual(apex);
      expect(new Set(items.map((f) => f.q)).size).toBe(items.length);
    }
    expect(getFaqItems("routine")[0].a).toContain(ROUTINE_MONTHLY_TOKEN);
    expect(getFaqItems("workout")[0].a).toContain(ROUTINE_MONTHLY_TOKEN);
  });

  it("list keys are unique per section and the hero has trust bullets and rotating words", () => {
    for (const k of SECTION_KEYS) {
      for (const list of [SECTION_SHOWCASE_KEYS[k], SECTION_BENTO_KEYS[k], SECTION_FEATURE_KEYS[k]]) {
        expect(new Set(list).size).toBe(list.length);
      }
      const h = getSectionHero(k, "آریون");
      expect(h.trust.length).toBe(4);
      expect(h.rotWords.length).toBeGreaterThanOrEqual(3);
      expect(h.phone.tasks.length).toBeGreaterThan(0);
    }
  });

  it("apex faq is unchanged by the optional section argument", () => {
    expect(getFaqItems()).toEqual(getFaqItems(null));
  });
});
