import { describe, expect, it } from "vitest";
import {
  MAX_SLIDES, buildStorySlides, capSlides, clipText, dayInitial, firstSentence, pickInsight, storySeconds, trendStory,
  type StorySlide,
} from "@/components/WeeklyLetterStoriesData";
import { normalizeLetter, odometerCells, scoreIntensity } from "@/components/WeeklyLetterUtils";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";

const day = (i: number, score: number | null, weekday: string) => ({
  date: `2026-09-${26 + i}`, weekday, score, isToday: false, isFuture: false,
  details: score === null ? {} : { routine: { done: 2, total: 3 }, sleep: { hours: 7.5, sleptAt: "23:30", wokeAt: "07:00", quality: 4 } },
});

const trendPts = (scores: (number | null)[]) => scores.map((score, i) => ({ weekStart: `2026-08-${String(i + 1).padStart(2, "0")}`, score, domains: {} }));

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
    trend: trendPts([50, 55, 52, 58, 60, 57, 61, 71]),
    insights: [
      { id: "bd", kind: "best_day", icon: "trophy", title: "بهترین روز: یکشنبه", body: "یکشنبه بهترین روز بود.", tone: "good" },
      { id: "dc", kind: "decline", icon: "trend_down", title: "افت در روتین", body: "امتیاز روتین از 71 به 51 افتاد.", tone: "bad", domain: "routine" },
    ],
    reflection: { wentWell: "ورزش منظم", improve: "خواب بیشتر", mood: 4, updatedAt: "" },
    achievements: [{ key: "k", title: "نشان", description: "", emoji: "✨", source: "weekly" }],
    streak: { days: 9 },
    nextWeek: { focusDomain: "routine", focusTitle: "تمرکز", focusText: "متن", suggestedTarget: 70 },
  } as unknown as Partial<WeeklyLetterData>) as WeeklyLetterData;
  return { ...base, ...over };
}

const ids = (l: WeeklyLetterData) => buildStorySlides(l).map((s) => s.id);
const get = <K extends StorySlide["id"]>(l: WeeklyLetterData, id: K) => buildStorySlides(l).find((s) => s.id === id) as Extract<StorySlide, { id: K }> | undefined;

describe("buildStorySlides", () => {
  it("نسخه‌ی کامل به ترتیب داستانی و حداکثر ده اسلاید (اعداد و بینش اول حذف می‌شن)", () => {
    const r = ids(letter());
    expect(r).toEqual(["intro", "score", "archetype", "rhythm", "best", "domains", "trend", "streak", "reflection", "summary"]);
    expect(r.length).toBeLessThanOrEqual(MAX_SLIDES);
  });

  it("capSlides از ضعیف‌ترین حذف می‌کنه و intro/score/summary رو نگه می‌داره", () => {
    const mk = (id: StorySlide["id"]) => ({ id, dur: 1000, label: id }) as unknown as StorySlide;
    const full = ["intro", "score", "archetype", "rhythm", "best", "domains", "numbers", "trend", "insight", "streak", "reflection", "summary"].map((x) => mk(x as StorySlide["id"]));
    expect(capSlides(full, 10).map((s) => s.id)).toEqual(["intro", "score", "archetype", "rhythm", "best", "domains", "trend", "streak", "reflection", "summary"]);
    expect(capSlides(full, 8).map((s) => s.id)).toEqual(["intro", "score", "archetype", "rhythm", "best", "trend", "reflection", "summary"]);
    const core = capSlides(full, 1).map((s) => s.id);
    expect(core).toContain("intro");
    expect(core).toContain("score");
    expect(core).toContain("summary");
    expect(capSlides(full.slice(0, 4), 10)).toHaveLength(4);
  });

  it("اسلاید ریتم: هفت میله، بهترین و کم‌ترین روز و بازه", () => {
    const r = get(letter(), "rhythm");
    expect(r?.bars).toHaveLength(7);
    expect(r?.min).toBe(40);
    expect(r?.max).toBe(80);
    expect(r?.bestDay).toBe("یکشنبه");
    expect(r?.worstDay).toBe("چهارشنبه");
    expect(r?.bars.filter((b) => b.best)).toHaveLength(1);
    expect(r?.bars[3].score).toBeNull();
  });

  it("ریتم با کمتر از سه روز امتیازدار یا امتیاز یکسان ساخته نمی‌شه", () => {
    const two = letter();
    two.days = two.days.map((d, i) => ({ ...d, score: i < 2 ? 60 + i : null }));
    expect(ids(two)).not.toContain("rhythm");
    const same = letter();
    same.days = same.days.map((d) => ({ ...d, score: 60 }));
    expect(ids(same)).not.toContain("rhythm");
  });

  it("بهترین روز و قوی‌ترین بخش درست انتخاب می‌شن", () => {
    const best = get(letter(), "best");
    const dom = get(letter(), "domains");
    expect(best?.day.weekday).toBe("یکشنبه");
    expect(dom?.top.domain).toBe("sleep");
    expect(dom?.riser).toEqual({ domain: "sleep", delta: 20 });
    expect(dom?.top.note).toBe("میانگین خواب 8.2 ساعت بود.");
  });

  it("حداکثر چهار عدد؛ خلاصه‌ی آخر سه عدد", () => {
    // سقف 10 اسلاید رو با حذف اسلایدهای دیگه آزاد می‌کنیم تا numbers بمونه
    const l = letter({ trend: [], insights: [], reflection: null });
    const n = get(l, "numbers");
    expect(n?.items).toHaveLength(4);
    expect(get(l, "summary")?.numbers).toHaveLength(3);
  });

  it("اسلاید بی‌داده رد می‌شه", () => {
    const l = letter({ archetype: null, streak: null, achievements: [], numbers: [], domains: [], days: [], trend: [], insights: [], reflection: null, overall: { ...letter().overall, score: null, grade: null } });
    expect(ids(l)).toEqual(["intro", "summary"]);
  });

  it("فقط یک عدد: اسلاید اعداد نمیاد؛ فقط دستاورد: اسلاید استریک میاد", () => {
    const l = letter({ numbers: letter().numbers.slice(0, 1), streak: null, trend: [], insights: [], reflection: null });
    expect(ids(l)).toContain("streak");
    expect(ids(l)).not.toContain("numbers");
  });

  it("بدون پیشرفت مثبت riser نداریم", () => {
    const l = letter();
    l.domains = l.domains.map((d) => ({ ...d, delta: -3 }));
    expect(get(l, "domains")?.riser).toBeNull();
  });

  it("یک روز امتیازدار = بهترین روز مقایسه‌ای نداریم", () => {
    const l = letter();
    l.days = l.days.map((d, i) => ({ ...d, score: i === 0 ? 70 : null }));
    expect(ids(l)).not.toContain("best");
  });

  it("اسلاید بینش: اولین بینش غیرتکراری (best_day رد می‌شه)، و اگه فقط best_day باشه نیست", () => {
    expect(get(letter({ trend: [], reflection: null }), "insight")?.insight.id).toBe("dc");
    const only = letter({ trend: [], reflection: null, insights: [{ id: "bd", kind: "best_day", icon: "trophy", title: "t", body: "b", tone: "good" }] });
    expect(ids(only)).not.toContain("insight");
    expect(pickInsight([])).toBeNull();
  });

  it("اسلاید حرف خودت: متن لازمه، فقط حال هفته کافی نیست", () => {
    const l = letter({ trend: [], insights: [] });
    const r = get(l, "reflection");
    expect(r?.primary).toEqual({ label: "چی خوب پیش رفت", text: "ورزش منظم" });
    expect(r?.secondary).toEqual({ label: "چی بهتر می‌شد", text: "خواب بیشتر" });
    expect(r?.mood).toBe(4);
    const onlyMood = letter({ trend: [], insights: [], reflection: { wentWell: "", improve: "", mood: 5, updatedAt: "" } });
    expect(ids(onlyMood)).not.toContain("reflection");
    const onlyImprove = get(letter({ trend: [], insights: [], reflection: { wentWell: "", improve: "کمتر دیر بخوابم", mood: null, updatedAt: "" } }), "reflection");
    expect(onlyImprove?.primary.label).toBe("چی بهتر می‌شد");
    expect(onlyImprove?.secondary).toBeNull();
    expect(onlyImprove?.mood).toBeNull();
  });

  it("اسلاید خلاصه همیشه آخره و داده‌ی آخر رو داره", () => {
    const s = get(letter(), "summary");
    expect(buildStorySlides(letter()).at(-1)?.id).toBe("summary");
    expect(s?.score).toBe(71);
    expect(s?.grade).toBe("B");
    expect(s?.archetype?.title).toBe("ثابت‌قدم");
    expect(s?.bestDay).toEqual({ weekday: "یکشنبه", score: 80 });
    expect(s?.focus).toEqual({ title: "تمرکز", domain: "routine", target: 70 });
  });
});

describe("مسیر هفته‌ها (trendStory)", () => {
  it("بهترین هفته از میان هفته‌های دارای امتیاز", () => {
    const t = trendStory(trendPts([50, 55, 52, 58, 60, 57, 61, 71]));
    expect(t?.mode).toBe("best");
    expect(t?.caption).toBe("بهترین هفته از 8 هفته‌ی اخیر");
    expect(t?.last).toBe(71);
  });
  it("بهتر یا پایین‌تر از میانگین هفته‌های قبل", () => {
    const up = trendStory(trendPts([60, 80, 40, 62]));
    expect(up?.mode).toBe("above");
    expect(up?.caption).toBe("2 امتیاز بهتر از میانگین");
    const down = trendStory(trendPts([60, 80, 70, 52]));
    expect(down?.mode).toBe("below");
    expect(down?.caption).toBe("18 امتیاز پایین‌تر از میانگین");
    expect(trendStory(trendPts([60, 80, 40, 60]))?.mode).toBe("even");
  });
  it("هفته‌ی بی‌امتیاز در میانه شمرده نمی‌شه؛ تعداد فقط امتیازدارها", () => {
    const t = trendStory(trendPts([null, 50, null, 55, 70]));
    expect(t?.count).toBe(3);
    expect(t?.caption).toBe("بهترین هفته از 3 هفته‌ی اخیر");
  });
  it("داده‌ی کم یا همین هفته بدون امتیاز = اسلاید نداریم", () => {
    expect(trendStory(trendPts([50, 60]))).toBeNull();
    expect(trendStory(trendPts([50, 60, 70, null]))).toBeNull();
    expect(trendStory(trendPts([null, null, 50, 70]))).toBeNull();
    expect(trendStory([])).toBeNull();
  });
});

describe("کمکی‌ها", () => {
  it("firstSentence نقطه‌ی اعشاری رو جدا نمی‌کنه", () => {
    expect(firstSentence("خواب 7.5 ساعت بود. بقیه")).toBe("خواب 7.5 ساعت بود.");
    expect(firstSentence("بدون نقطه")).toBe("بدون نقطه");
  });
  it("dayInitial", () => {
    expect(dayInitial("شنبه")).toBe("ش");
  });
  it("clipText سر کلمه کوتاه می‌کنه", () => {
    expect(clipText("کوتاه")).toBe("کوتاه");
    const long = "کلمه ".repeat(60);
    const c = clipText(long, 50);
    expect(c.endsWith("…")).toBe(true);
    expect(c.length).toBeLessThanOrEqual(52);
  });
  it("storySeconds مدت تقریبی رو گرد به پنج می‌ده و آخرین اسلاید رو نمی‌شمره", () => {
    const mk = (dur: number) => ({ id: "intro", dur, label: "" }) as unknown as StorySlide;
    expect(storySeconds([mk(4000), mk(5000), mk(9000)])).toBe(10);
    expect(storySeconds([mk(4000)])).toBe(0);
    expect(storySeconds([mk(1000), mk(1000)])).toBe(5);
  });
  it("odometerCells رقم‌ها رو جدا و بقیه رو ثابت نگه می‌داره", () => {
    expect(odometerCells("9/17")).toEqual([{ kind: "digit", digit: 9 }, { kind: "char", ch: "/" }, { kind: "digit", digit: 1 }, { kind: "digit", digit: 7 }]);
    expect(odometerCells("8.2%").map((c) => c.kind)).toEqual(["digit", "char", "digit", "char"]);
    expect(odometerCells("")).toEqual([]);
  });
  it("scoreIntensity بین 0.4 و 1 و یکنواخت", () => {
    expect(scoreIntensity(null)).toBe(0.4);
    expect(scoreIntensity(0)).toBe(0.4);
    expect(scoreIntensity(100)).toBe(1);
    expect(scoreIntensity(250)).toBe(1);
    expect(scoreIntensity(70)).toBeGreaterThan(scoreIntensity(40));
  });
});
