import { describe, expect, it } from "vitest";
import { buildStorySlides, dayInitial, firstSentence, gradeAccent } from "@/components/WeeklyLetterStoriesData";
import { normalizeLetter } from "@/components/WeeklyLetterUtils";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";

const day = (i: number, score: number | null, weekday: string) => ({
  date: `2026-09-${26 + i}`, weekday, score, isToday: false, isFuture: false,
  details: score === null ? {} : { routine: { done: 2, total: 3 }, sleep: { hours: 7.5, sleptAt: "23:30", wokeAt: "07:00", quality: 4 } },
});

function letter(over: Partial<WeeklyLetterData> = {}): WeeklyLetterData {
  const base = normalizeLetter({
    v: 1, issueNo: 4, weekStart: "2026-09-26", weekEnd: "2026-10-02", weekLabel: "4 تا 10 مهر", generatedAt: "",
    headline: "تیتر", intro: "مقدمه", greetingName: "سارا",
    archetype: { key: "steady", title: "ثابت‌قدم", description: "توضیح", tone: "good" },
    overall: { score: 71, prevScore: 60, delta: 11, grade: "B", consistency: 80, activeDays: 7, rank: { position: 1, of: 8 } },
    days: [day(0, 50, "شنبه"), day(1, 80, "یکشنبه"), day(2, 60, "دوشنبه"), day(3, null, "سه‌شنبه"), day(4, 40, "چهارشنبه"), day(5, 55, "پنجشنبه"), day(6, 62, "جمعه")],
    domains: [
      { domain: "sleep", active: true, hasData: true, score: 90, prevScore: 70, delta: 20, daysWithData: 5, daily: [], stats: [], note: "میانگین خواب 8.2 ساعت بود. نکته‌ی دوم." },
      { domain: "routine", active: true, hasData: true, score: 60, prevScore: 58, delta: 2, daysWithData: 7, daily: [], stats: [], note: "x" },
    ],
    numbers: [
      { key: "a", label: "الف", value: "9/17", domain: "routine" },
      { key: "b", label: "ب", value: "8.2", unit: "ساعت", domain: "sleep" },
      { key: "c", label: "ج", value: "3", domain: null },
      { key: "d", label: "د", value: "5", domain: null },
      { key: "e", label: "ه", value: "6", domain: null },
    ],
    achievements: [{ key: "k", title: "نشان", description: "", emoji: "✨", source: "weekly" }],
    streak: { days: 9 },
    nextWeek: { focusDomain: "routine", focusTitle: "تمرکز", focusText: "متن", suggestedTarget: 70 },
  } as unknown as Partial<WeeklyLetterData>) as WeeklyLetterData;
  return { ...base, ...over };
}

const ids = (l: WeeklyLetterData) => buildStorySlides(l).map((s) => s.id);

describe("buildStorySlides", () => {
  it("نسخه‌ی کامل هشت اسلاید به ترتیب می‌سازه", () => {
    expect(ids(letter())).toEqual(["intro", "score", "archetype", "best", "domains", "numbers", "streak", "next"]);
  });

  it("بهترین روز و قوی‌ترین بخش درست انتخاب می‌شن", () => {
    const s = buildStorySlides(letter());
    const best = s.find((x) => x.id === "best");
    const dom = s.find((x) => x.id === "domains");
    expect(best && best.id === "best" && best.day.weekday).toBe("یکشنبه");
    expect(dom && dom.id === "domains" && dom.top.domain).toBe("sleep");
    expect(dom && dom.id === "domains" && dom.riser).toEqual({ domain: "sleep", delta: 20 });
    expect(dom && dom.id === "domains" && dom.top.note).toBe("میانگین خواب 8.2 ساعت بود.");
  });

  it("حداکثر چهار عدد", () => {
    const n = buildStorySlides(letter()).find((x) => x.id === "numbers");
    expect(n && n.id === "numbers" && n.items).toHaveLength(4);
  });

  it("اسلاید بی‌داده رد می‌شه", () => {
    const l = letter({ archetype: null, streak: null, achievements: [], numbers: [], domains: [], days: [], overall: { ...letter().overall, score: null, grade: null } });
    expect(ids(l)).toEqual(["intro", "next"]);
  });

  it("فقط یک عدد: اسلاید اعداد نمیاد؛ فقط دستاورد: اسلاید استریک میاد", () => {
    const l = letter({ numbers: letter().numbers.slice(0, 1), streak: null });
    expect(ids(l)).toContain("streak");
    expect(ids(l)).not.toContain("numbers");
  });

  it("بدون پیشرفت مثبت riser نداریم", () => {
    const l = letter();
    l.domains = l.domains.map((d) => ({ ...d, delta: -3 }));
    const dom = buildStorySlides(l).find((x) => x.id === "domains");
    expect(dom && dom.id === "domains" && dom.riser).toBeNull();
  });

  it("یک روز امتیازدار = بهترین روز مقایسه‌ای نداریم", () => {
    const l = letter();
    l.days = l.days.map((d, i) => ({ ...d, score: i === 0 ? 70 : null }));
    expect(ids(l)).not.toContain("best");
  });
});

describe("کمکی‌ها", () => {
  it("firstSentence نقطه‌ی اعشاری رو جدا نمی‌کنه", () => {
    expect(firstSentence("خواب 7.5 ساعت بود. بقیه")).toBe("خواب 7.5 ساعت بود.");
    expect(firstSentence("بدون نقطه")).toBe("بدون نقطه");
  });
  it("dayInitial و gradeAccent", () => {
    expect(dayInitial("شنبه")).toBe("ش");
    expect(gradeAccent("C")).toBe("wl-gr-C");
    expect(gradeAccent(null)).toBe("");
  });
});
