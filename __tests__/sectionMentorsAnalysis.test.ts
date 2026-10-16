import { describe, it, expect } from "vitest";
import {
  MENTOR_CATEGORIES, MENTOR_CATEGORY_META, effectiveCategories, intersectsCategories, isMentorCategory,
  programTypeAllowed, restrictCategories, sanitizeCategories,
} from "@/lib/mentorCategories";
import { SECTION_META, SECTION_KEYS } from "@/lib/sections";
import { filterWhere, rankScopeFor } from "@/lib/mentorSearchServer";
import { DEFAULT_FILTERS } from "@/lib/mentorSearch";
import {
  SECTION_ANALYSIS_DOMAINS, aiForSection, aiToStore, goalInSection, sectionAchievementCategory,
  sectionDomains, sectionHasDomain, sectionShowsRoutineStreak,
} from "@/lib/weeklyLetter/section";
import { ANALYSIS_DOMAINS } from "@/lib/weeklyAnalysis/types";

describe("دسته‌ی منتوری TRADE", () => {
  it("ثبت شده و برچسب دارد", () => {
    expect(MENTOR_CATEGORIES).toContain("TRADE");
    expect(isMentorCategory("TRADE")).toBe(true);
    expect(sanitizeCategories(["TRADE", "X", "TRADE"])).toEqual(["TRADE"]);
    expect(MENTOR_CATEGORY_META.TRADE.short).toBeTruthy();
    expect(MENTOR_CATEGORY_META.TRADE.certLabel).toBeTruthy();
  });

  it("نوع برنامه‌ی خودش را ندارد: منتور فقط ترید برنامه‌ی روتین/تمرین نمی‌سازد", () => {
    expect(programTypeAllowed("ROUTINE", [], ["TRADE"])).toBe(false);
    expect(programTypeAllowed("WORKOUT", ["TRADE"], ["TRADE", "FITNESS"])).toBe(false);
    expect(programTypeAllowed("WORKOUT", [], ["TRADE", "FITNESS"])).toBe(true);
    expect(effectiveCategories([], ["TRADE"])).toEqual(["TRADE"]);
  });

  it("هر دسته‌ی بخش‌ها یک دسته‌ی ثبت‌شده است", () => {
    for (const k of SECTION_KEYS) for (const c of SECTION_META[k].mentorCategories) expect(isMentorCategory(c)).toBe(true);
  });

  it("restrictCategories / intersectsCategories", () => {
    expect(restrictCategories(MENTOR_CATEGORIES, null)).toEqual([...MENTOR_CATEGORIES]);
    expect(restrictCategories(MENTOR_CATEGORIES, SECTION_META.workout.mentorCategories)).toEqual(["FITNESS", "NUTRITION"]);
    expect(restrictCategories(MENTOR_CATEGORIES, SECTION_META.trade.mentorCategories)).toEqual(["TRADE"]);
    expect(intersectsCategories(["ROUTINE", "FITNESS"], SECTION_META.workout.mentorCategories)).toBe(true);
    expect(intersectsCategories(["ROUTINE"], SECTION_META.trade.mentorCategories)).toBe(false);
    expect(intersectsCategories([], SECTION_META.trade.mentorCategories)).toBe(false);
    expect(intersectsCategories(["ROUTINE"], null)).toBe(true);
  });
});

describe("فیلتر کشف منتور به تفکیک بخش", () => {
  const base = { published: true };
  it("دامنه‌ی اصلی: بدون محدودیت", () => {
    expect(filterWhere(DEFAULT_FILTERS, base)).toEqual({ AND: [base] });
    expect(filterWhere({ ...DEFAULT_FILTERS, category: "TRADE" }, base)).toEqual({ AND: [base, { categories: { has: "TRADE" } }] });
  });
  it("بخش: همه = hasSome حوزه‌های بخش", () => {
    expect(filterWhere(DEFAULT_FILTERS, base, ["FITNESS", "NUTRITION"])).toEqual({ AND: [base, { categories: { hasSome: ["FITNESS", "NUTRITION"] } }] });
  });
  it("بخش: حوزه‌ی بیرون از بخش نادیده گرفته می‌شود", () => {
    const w = filterWhere({ ...DEFAULT_FILTERS, category: "ROUTINE" }, base, ["TRADE"]);
    expect(w).toEqual({ AND: [base, { categories: { hasSome: ["TRADE"] } }] });
    const ok = filterWhere({ ...DEFAULT_FILTERS, category: "NUTRITION" }, base, ["FITNESS", "NUTRITION"]);
    expect(ok).toEqual({ AND: [base, { categories: { has: "NUTRITION" } }] });
  });
  it("فیلتر مدرک فقط روی حوزه‌های بخش", () => {
    const w = filterWhere({ ...DEFAULT_FILTERS, cert: true }, base, ["TRADE"]) as { AND: any[] };
    const cert = w.AND[w.AND.length - 1];
    expect(cert.OR).toHaveLength(1);
    expect(cert.OR[0].categories).toEqual({ has: "TRADE" });
  });
  it("دامنه‌ی رتبه‌بندی", () => {
    expect(rankScopeFor("", null)).toBe("ALL");
    expect(rankScopeFor("FITNESS", null)).toBe("FITNESS");
    expect(rankScopeFor("", ["TRADE"])).toBe("TRADE");
    expect(rankScopeFor("", ["FITNESS", "NUTRITION"])).toBe("ALL");
    expect(rankScopeFor("ROUTINE", ["TRADE"])).toBe("TRADE");
    expect(rankScopeFor("NUTRITION", ["FITNESS", "NUTRITION"])).toBe("NUTRITION");
  });
});

describe("آنالیز هفتگی به تفکیک بخش", () => {
  it("دامنه‌های هر بخش", () => {
    expect(sectionDomains(null)).toBeUndefined();
    expect(SECTION_ANALYSIS_DOMAINS.trade).toEqual(["trading"]);
    expect(SECTION_ANALYSIS_DOMAINS.workout).toEqual(["fitness", "nutrition", "sleep"]);
    expect(SECTION_ANALYSIS_DOMAINS.routine).toEqual(["routine", "sleep", "tasks", "learning"]);
  });
  it("هر دامنه حداقل در یک بخش هست و بخش‌ها دامنه‌ی نامعتبر ندارند", () => {
    for (const d of ANALYSIS_DOMAINS) expect(SECTION_KEYS.some((k) => sectionHasDomain(k, d))).toBe(true);
    for (const k of SECTION_KEYS) for (const d of SECTION_ANALYSIS_DOMAINS[k]) expect(ANALYSIS_DOMAINS).toContain(d);
  });
  it("sectionHasDomain", () => {
    expect(sectionHasDomain(null, "trading")).toBe(true);
    expect(sectionHasDomain("trade", "sleep")).toBe(false);
    expect(sectionHasDomain("workout", "sleep")).toBe(true);
    expect(sectionHasDomain("routine", "fitness")).toBe(false);
  });
  it("اهداف: عمومی همه‌جا، دامنه‌دار فقط در بخش خودش", () => {
    expect(goalInSection({ domain: null }, "trade")).toBe(true);
    expect(goalInSection({ domain: "trading" }, "trade")).toBe(true);
    expect(goalInSection({ domain: "sleep" }, "trade")).toBe(false);
    expect(goalInSection({ domain: "sleep" }, null)).toBe(true);
  });
  it("استریک و اچیومنت", () => {
    expect(sectionShowsRoutineStreak(null)).toBe(true);
    expect(sectionShowsRoutineStreak("routine")).toBe(true);
    expect(sectionShowsRoutineStreak("workout")).toBe(false);
    expect(sectionAchievementCategory("trade", "trade")).toBe(true);
    expect(sectionAchievementCategory("trade", "streak")).toBe(false);
    expect(sectionAchievementCategory("workout", "body")).toBe(true);
    expect(sectionAchievementCategory(null, "special")).toBe(true);
  });
  it("مربی AI: برچسب بخش و فیلتر پیشنهادها", () => {
    const ai = { summary: "s", recommendations: [{ title: "a", description: "d", domain: "trading" as const, priority: "high" as const }, { title: "b", description: "d", domain: "sleep" as const, priority: "low" as const }], generatedAt: "x", model: "m" };
    expect(aiForSection(null, "trade")).toBeNull();
    // بدون برچسب: فقط دامنه‌ی اصلی
    expect(aiForSection(ai, null)).toBe(ai);
    expect(aiForSection(ai, "trade")).toBeNull();
    const stored = aiToStore(ai, "trade");
    expect(stored.scope).toBe("trade");
    expect(aiToStore(ai, null)).toBe(ai);
    expect(aiForSection(stored, null)).toBeNull();
    expect(aiForSection(stored, "routine")).toBeNull();
    const shown = aiForSection(stored, "trade");
    expect(shown && "scope" in shown).toBe(false);
    expect(shown?.recommendations.map((r) => r.title)).toEqual(["a"]);
  });
});
