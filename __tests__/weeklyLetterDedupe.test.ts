import { describe, expect, it } from "vitest";
import { dedupeNumbers, dedupeWins, numTokens } from "@/lib/weeklyLetter/dedupe";
import type { WeekNumber } from "@/lib/weeklyAnalysis/types";

const num = (key: string, value: string, domain: WeekNumber["domain"]): WeekNumber => ({ key, label: key, value, domain });
const dom = (domain: "routine" | "sleep" | "fitness", values: string[]) => ({
  domain, hasData: true, score: 70, stats: values.map((value) => ({ label: "x", value })),
});

describe("numTokens", () => {
  it("عددها رو بدون واحد و علامت درمیاره", () => {
    expect(numTokens("14/18")).toEqual(["14", "18"]);
    expect(numTokens("+6.30 ساعت")).toEqual(["6.3"]);
    expect(numTokens("تعیین نشده")).toEqual([]);
  });
});

describe("dedupeNumbers", () => {
  const domains = [dom("routine", ["70%", "14/18"]), dom("sleep", ["6.3 ساعت"]), dom("fitness", ["3/4", "1"])];
  it("آمار تکراری کارت بخش‌ها حذف می‌شه و یکتاها می‌مونن", () => {
    const out = dedupeNumbers([
      num("routine_done", "14/18", "routine"), num("sleep_avg", "6.3", "sleep"), num("fit", "3/4", "fitness"),
      num("active", "6/7", null), num("bed", "23:30", "sleep"), num("wake", "07:10", "sleep"),
    ], domains);
    expect(out.map((n) => n.key)).toEqual(["active", "bed", "wake"]);
  });
  it("برچسب معادل حتی با گردکردن متفاوت تکرار حساب می‌شه", () => {
    const d = [{ domain: "sleep" as const, hasData: true, score: 70, stats: [{ label: "میانگین خواب", value: "6.3 ساعت" }] }];
    expect(dedupeNumbers([num("sleep_avg", "6.4", "sleep"), num("a", "7/7", null), num("sleep_bed", "00:26", "sleep")], d).map((n) => n.key)).toEqual(["a", "sleep_bed"]);
  });
  it("کمتر از دو کاشی می‌مونه یعنی هیچ", () => {
    expect(dedupeNumbers([num("routine_done", "14/18", "routine"), num("active", "6/7", null)], domains)).toEqual([]);
  });
  it("دامنه‌ای که کارت نداره کاشی‌اش می‌مونه", () => {
    const out = dedupeNumbers([num("a", "14/18", "routine"), num("b", "1", null)], [{ ...dom("routine", ["14/18"]), hasData: false }]);
    expect(out).toHaveLength(2);
  });
});

describe("dedupeWins", () => {
  const insights = [
    { title: "بهتر از هفته‌ی قبل", body: "امتیاز کلت از 62 به 71 رسید (+9)." },
    { title: "بهترین روز: شنبه", body: "شنبه با امتیاز 90 بهترین روز هفته‌ت بود." },
  ];
  it("برد تکراری بینش و استریک حذف می‌شه", () => {
    const wins = [
      "امتیاز کلت از 62 به 71 رسید، 9 واحد بهتر از هفته‌ی قبل.",
      "شنبه با امتیاز 90 قوی‌ترین روزت بود.",
      "4 روز پشت‌سرهم امتیازت بالای 70 بود.",
      "3 روز تمام برنامه‌های روتینت رو انجام دادی.",
    ];
    expect(dedupeWins(wins, insights)).toEqual(["3 روز تمام برنامه‌های روتینت رو انجام دادی."]);
  });
  it("یک عدد مشترک بدون نام روز تکرار حساب نمی‌شه", () => {
    expect(dedupeWins(["9 جلسه تمرین کردی."], insights)).toHaveLength(1);
  });
});
