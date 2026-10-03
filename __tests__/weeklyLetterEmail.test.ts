import { describe, it, expect } from "vitest";
import { renderWeeklyLetterEmail } from "@/lib/email/weeklyLetterTemplate";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";

// فکتور کامل با تمام فیلدها
const fullFixture: WeeklyLetterData = {
  v: 1,
  issueNo: 12,
  weekStart: "1405-07-05",
  weekEnd: "1405-07-11",
  weekLabel: "5 تا 11 مهر",
  generatedAt: "2026-10-03T10:00:00Z",
  greetingName: "علی",
  headline: "5 روز از 7 روز بالای 70 بودی و خوابت 0.6 ساعت بیشتر شد",
  intro: "این هفته یک هفته‌ی قوی برای توست. پیشرفت خوب در خواب و ثبات در روتین.",
  archetype: {
    key: "rising",
    title: "صعود مستمر",
    description: "امتیازت هر روز بهتر می‌شد — به 67 رسیدی که 12 امتیاز بالاتر از هفته‌ی قبل است.",
    tone: "good",
  },
  overall: {
    score: 67,
    prevScore: 55,
    delta: 12,
    grade: "A",
    consistency: 75,
    activeDays: 7,
    rank: { position: 2, of: 8 },
  },
  days: [
    {
      date: "1405-07-05",
      weekday: "شنبه",
      score: 72,
      isToday: false,
      isFuture: false,
      details: {
        routine: { done: 5, total: 6 },
        sleep: { hours: 7.2, sleptAt: "23:40", wokeAt: "07:10", quality: 85 },
        fitness: { status: "done" },
        nutrition: { kcal: 2140, target: 2200, protein: 120 },
        trading: { count: 3, wins: 2, losses: 1, net: 450, currency: "USD" },
        tasks: { done: 2, due: 3 },
        learning: { steps: 1 },
      },
    },
    {
      date: "1405-07-06",
      weekday: "یکشنبه",
      score: 68,
      isToday: false,
      isFuture: false,
      details: {
        routine: { done: 6, total: 6 },
        sleep: { hours: 7.0, sleptAt: "23:50", wokeAt: "07:20", quality: 80 },
        fitness: { status: "done" },
        nutrition: { kcal: 2200, target: 2200, protein: 125 },
        trading: { count: 2, wins: 1, losses: 1, net: 200, currency: "USD" },
        tasks: { done: 3, due: 3 },
        learning: { steps: 2 },
      },
    },
    {
      date: "1405-07-07",
      weekday: "دوشنبه",
      score: null,
      isToday: false,
      isFuture: false,
      details: {},
    },
    {
      date: "1405-07-08",
      weekday: "سه‌شنبه",
      score: 62,
      isToday: false,
      isFuture: false,
      details: {
        routine: { done: 4, total: 6 },
        fitness: { status: "rest" },
        nutrition: { kcal: 1900, target: 2200, protein: 110 },
      },
    },
    {
      date: "1405-07-09",
      weekday: "چهارشنبه",
      score: 70,
      isToday: false,
      isFuture: false,
      details: {
        routine: { done: 6, total: 6 },
        sleep: { hours: 7.5, sleptAt: "23:30", wokeAt: "07:15", quality: 90 },
        fitness: { status: "done" },
        nutrition: { kcal: 2150, target: 2200, protein: 130 },
      },
    },
    {
      date: "1405-07-10",
      weekday: "پنج‌شنبه",
      score: 65,
      isToday: false,
      isFuture: false,
      details: {
        routine: { done: 5, total: 6 },
        sleep: { hours: 6.8, sleptAt: "00:00", wokeAt: "06:48", quality: 70 },
        fitness: { status: "missed" },
        nutrition: { kcal: 2050, target: 2200, protein: 115 },
      },
    },
    {
      date: "1405-07-11",
      weekday: "جمعه",
      score: 75,
      isToday: true,
      isFuture: false,
      details: {
        routine: { done: 6, total: 6 },
        sleep: { hours: 7.3, sleptAt: "23:45", wokeAt: "07:30", quality: 88 },
        fitness: { status: "extra" },
        nutrition: { kcal: 2200, target: 2200, protein: 135 },
        trading: { count: 1, wins: 1, losses: 0, net: 300, currency: "USD" },
        tasks: { done: 3, due: 3 },
      },
    },
  ],
  domains: [
    {
      domain: "routine",
      active: true,
      hasData: true,
      score: 92,
      prevScore: 88,
      delta: 4,
      daysWithData: 7,
      daily: [83, 100, null, 67, 100, 83, 100],
      stats: [{ label: "برنامه‌ها", value: "36/42" }],
      note: "روتین خیلی قوی بود، هیچ روز جا نگذاشتی",
      bestDay: "یکشنبه",
      worstDay: "سه‌شنبه",
    },
    {
      domain: "sleep",
      active: true,
      hasData: true,
      score: 85,
      prevScore: 75,
      delta: 10,
      daysWithData: 6,
      daily: [92, 90, null, 80, 95, 80, 95],
      stats: [
        { label: "میانگین", value: "7.1 ساعت" },
        { label: "بهترین", value: "7.5 ساعت" },
      ],
      note: "خواب‌ات خیلی بهتر شد",
      bestDay: "چهارشنبه",
      worstDay: "پنج‌شنبه",
    },
    {
      domain: "fitness",
      active: true,
      hasData: true,
      score: 78,
      prevScore: 70,
      delta: 8,
      daysWithData: 7,
      daily: [100, 100, null, 70, 100, 0, 120],
      stats: [{ label: "تمام‌شده", value: "5 از 6" }],
      note: "تمرین‌ها پیوسته بود",
      bestDay: "جمعه",
      worstDay: "پنج‌شنبه",
    },
  ],
  numbers: [
    {
      key: "routine_done",
      label: "برنامه‌های انجام‌شده",
      value: "36/42",
      domain: "routine",
      tone: "good",
      hint: "4 بیشتر از هفته‌ی قبل",
    },
    {
      key: "avg_sleep",
      label: "میانگین خواب",
      value: "7.1",
      unit: "ساعت",
      domain: "sleep",
      tone: "good",
      hint: "0.6 ساعت بیشتر",
    },
    {
      key: "workout_done",
      label: "تمرین انجام‌شده",
      value: "5/6",
      domain: "fitness",
      tone: "neutral",
    },
    {
      key: "perfect_days",
      label: "روزهای کامل",
      value: "2",
      domain: null,
      tone: "good",
    },
  ],
  trend: [],
  insights: [],
  wins: [
    "در تمام 7 روز برنامه‌های روتینت را انجام دادی",
    "خوابت 0.6 ساعت بیشتر از هفته‌ی قبل شد",
    "دو روز کامل (همه دامنه‌ها بالای 80) داشتی",
  ],
  improve: [
    "جمعه تمرین را جا گذاشتی — دوباره روتین بسازی",
    "تغذیه‌ات 100 kcal کمتر از هدف بود",
  ],
  achievements: [],
  streak: { days: 5 },
  goals: [],
  reflection: null,
  ai: {
    summary: "هفته‌ای بسیار خوب. روتین ثابت و خواب بهتر شد.",
    recommendations: [
      {
        title: "خواب",
        description: "سعی کن شب‌ها 23:30 خواب رو",
        domain: "sleep",
        priority: "high",
      },
      {
        title: "تمرین",
        description: "جمعه دوباره تمرین کن، بدون جاگذاشتن",
        domain: "fitness",
        priority: "high",
      },
    ],
    generatedAt: "2026-10-03T09:30:00Z",
    model: "gpt-4",
  },
  nextWeek: {
    focusDomain: "fitness",
    focusTitle: "تمرکز هفته‌ی بعد: بدنسازی",
    focusText: "هدفت این هفته: انجام تمام 6 جلسه‌ی تمرین بدون جاگذاشتن.",
    suggestedTarget: 90,
  },
};

// فکتور مینیمال (فقط فیلدهای الزامی، بدون AI و خیلی چیزها)
const minimalFixture: WeeklyLetterData = {
  v: 1,
  issueNo: 1,
  weekStart: "1405-06-28",
  weekEnd: "1405-07-04",
  weekLabel: "28 الی 4 مهر",
  generatedAt: "2026-09-26T10:00:00Z",
  greetingName: null,
  headline: "شروع خوب",
  intro: "اولین هفته‌ات را شروع کردی.",
  archetype: null,
  overall: {
    score: null,
    prevScore: null,
    delta: null,
    grade: null,
    consistency: null,
    activeDays: 0,
    rank: null,
  },
  days: [],
  domains: [],
  numbers: [],
  trend: [],
  insights: [],
  wins: [],
  improve: [],
  achievements: [],
  streak: null,
  goals: [],
  reflection: null,
  ai: null,
  nextWeek: {
    focusDomain: null,
    focusTitle: "",
    focusText: "",
    suggestedTarget: null,
  },
};

describe("renderWeeklyLetterEmail", () => {
  it("generates subject with issue number and week label", () => {
    const { subject } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });
    expect(subject).toContain("12");
    expect(subject).toContain("5 تا 11 مهر");
    expect(subject).toContain("آریون");
  });

  it("escapes HTML in dynamic strings to prevent injection", () => {
    const maliciousFixture: WeeklyLetterData = {
      ...fullFixture,
      headline: '<script>alert("xss")</script>بد',
      greetingName: '"><script>alert(1)</script>',
    };
    const { html, text } = renderWeeklyLetterEmail(maliciousFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(text).not.toContain('<script>');
  });

  it("includes CTA button href equal to opts.url", () => {
    const url = "https://example.com/letters/1405-07-05";
    const { html } = renderWeeklyLetterEmail(fullFixture, {
      url,
      siteUrl: "https://example.com",
    });
    expect(html).toContain(`href="${url}"`);
  });

  it("renders minimal fixture without throwing", () => {
    expect(() => {
      renderWeeklyLetterEmail(minimalFixture, {
        url: "https://example.com/letters/1405-06-28",
        siteUrl: "https://example.com",
      });
    }).not.toThrow();
  });

  it("omits empty sections (no archetype, no AI, no wins)", () => {
    const { html, text } = renderWeeklyLetterEmail(minimalFixture, {
      url: "https://example.com/letters/1405-06-28",
      siteUrl: "https://example.com",
    });
    // Minimal fixture has no archetype, AI, wins, etc.
    expect(html).not.toContain("صعود مستمر"); // archetype from full fixture
    expect(text).not.toContain("بردهای هفته");
    expect(text).not.toContain("حرف مربی");
  });

  it("contains no Arabic diacritics (U+064B–U+0652, U+0670)", () => {
    const { html, text } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });

    // Arabic diacritics: kasra (064B), fatha (064E), damma (064F), tanwin (064B–064D),
    // shadda (0651), sukun (0652), alef-khanjariyah (0670)
    const arabicDiacriticPattern = /[\u064B-\u0652\u0670]/g;

    const htmlDiacritics = html.match(arabicDiacriticPattern);
    const textDiacritics = text.match(arabicDiacriticPattern);

    expect(htmlDiacritics).toBeFalsy();
    expect(textDiacritics).toBeFalsy();
  });

  it("never uses the letters U+0623 or U+0625", () => {
    const { html, text } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });

    expect(html).not.toContain("\u0623");
    expect(html).not.toContain("\u0625");
    expect(text).not.toContain("\u0623");
    expect(text).not.toContain("\u0625");
  });

  it("uses only Latin digits (0-9), not Persian digits", () => {
    const { html, text } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });

    // Persian digits: U+06F0–U+06F9
    const persianDigitPattern = /[\u06F0-\u06F9]/g;

    const htmlPersianDigits = html.match(persianDigitPattern);
    const textPersianDigits = text.match(persianDigitPattern);

    // No Persian digits should be present (we use 0-9 only)
    expect(htmlPersianDigits).toBeFalsy();
    expect(textPersianDigits).toBeFalsy();

    // But Latin digits should be present
    expect(html).toMatch(/\d/);
    expect(text).toMatch(/\d/);
  });

  it("returns both html and text versions", () => {
    const result = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
    expect(typeof result.subject).toBe("string");
    expect(typeof result.html).toBe("string");
    expect(typeof result.text).toBe("string");
    expect(result.html).toContain("<!doctype html>");
    expect(result.html).toContain("dir=\"rtl\"");
    expect(result.html).toContain("lang=\"fa\"");
  });

  it("includes headline and intro in both versions", () => {
    const { html, text } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });
    expect(html).toContain(escapeHtml(fullFixture.headline));
    expect(html).toContain(escapeHtml(fullFixture.intro));
    expect(text).toContain(fullFixture.headline);
    expect(text).toContain(fullFixture.intro);
  });

  it("safely handles URLs that don't start with http(s)", () => {
    const { html } = renderWeeklyLetterEmail(fullFixture, {
      url: "javascript:alert(1)",
      siteUrl: "ftp://example.com",
    });
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("ftp://");
    expect(html).toContain('href="#"');
  });

  it("includes wins and improve lists when present", () => {
    const { html, text } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });
    expect(html).toContain("بردهای هفته");
    expect(html).toContain("جای پیشرفت");
    expect(text).toContain("بردهای هفته");
    expect(text).toContain("جای پیشرفت");
    fullFixture.wins.forEach((w) => {
      expect(html).toContain(escapeHtml(w));
      expect(text).toContain(w);
    });
  });

  it("includes AI coach summary and recommendations when present", () => {
    const { html, text } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });
    expect(html).toContain("حرف مربی");
    expect(text).toContain("حرف مربی");
    if (fullFixture.ai) {
      expect(html).toContain(escapeHtml(fullFixture.ai.summary));
      expect(text).toContain(fullFixture.ai.summary);
    }
  });

  it("includes day-by-day table with weekdays and scores", () => {
    const { html, text } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });
    expect(html).toContain("روزبه‌روز");
    expect(text).toContain("روزبه‌روز");
    fullFixture.days.forEach((day) => {
      expect(html).toContain(escapeHtml(day.weekday));
      expect(text).toContain(day.weekday);
    });
  });

  it("includes numbers section with label and value", () => {
    const { html, text } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });
    expect(html).toContain("اعداد هفته");
    expect(text).toContain("اعداد هفته");
    fullFixture.numbers.forEach((n) => {
      expect(html).toContain(escapeHtml(n.label));
      expect(html).toContain(escapeHtml(n.value));
    });
  });

  it("includes prefs link in footer", () => {
    const siteUrl = "https://example.com";
    const { html, text } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl,
    });
    const prefsUrl = `${siteUrl}/analysis/weekly/letters`;
    expect(html).toContain(prefsUrl);
    expect(text).toContain(prefsUrl);
  });

  it("formats delta with symbol and color for good/bad tone", () => {
    const { html } = renderWeeklyLetterEmail(fullFixture, {
      url: "https://example.com/letters/1405-07-05",
      siteUrl: "https://example.com",
    });
    // fullFixture.overall.delta = 12 (positive), should contain ▲ and positive color
    expect(html).toContain("▲");
    expect(html).toContain("+12");
    expect(html).toContain("#00A86B"); // good color
  });
});

// هلپر برای تست‌ها
function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c] || c);
}
