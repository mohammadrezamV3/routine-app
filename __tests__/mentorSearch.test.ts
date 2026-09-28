import { describe, expect, it } from "vitest";
import {
  RELEVANCE_MIN, blendScore, filtersFromParams, filtersToParams, buildSearchDoc, damerauLevenshtein, expandSynonyms, normalizeFa, parseQuery, relevance,
  tokenSimilarity, tokenize, trigramSimilarity,
} from "@/lib/mentorSearch";

const LABELS: Record<string, string> = { ROUTINE: "روتین و برنامه‌ریزی", FITNESS: "بدنسازی", NUTRITION: "تغذیه" };
const label = (c: string) => LABELS[c] ?? c;

const konkur = buildSearchDoc({
  name: "نگار کریمی",
  headline: "برنامه‌ریزی کنکور تجربی و ریاضی",
  routineRole: "مشاور کنکور",
  specialties: ["کنکور تجربی", "برنامه‌ی آزمون"],
  bio: "مشاور تحصیلی. برنامه‌ی روزانه‌ی مطالعه، آزمون و مرور",
  categories: ["ROUTINE"],
}, label);
const fitness = buildSearchDoc({
  name: "امیر رضایی",
  headline: "مربی بدنسازی، افزایش حجم و کاهش چربی",
  specialties: ["هایپرتروفی", "حرکات اصلاحی"],
  bio: "۱۰ سال سابقه‌ی مربیگری در باشگاه",
  categories: ["FITNESS", "NUTRITION"],
}, label);
const math = buildSearchDoc({
  name: "سارا احمدی",
  headline: "برنامه‌ی درسی هفتگی برای پایه‌ی دهم تا دوازدهم",
  routineRole: "استاد ریاضی",
  specialties: ["حسابان", "هندسه"],
  categories: ["ROUTINE"],
}, label);
const all = { konkur, fitness, math };

function hits(q: string): string[] {
  const pq = parseQuery(q);
  return Object.entries(all)
    .map(([k, d]) => [k, relevance(pq, d)] as const)
    .filter(([, r]) => r >= RELEVANCE_MIN)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

describe("normalizeFa", () => {
  it("یکسان‌سازیِ حروفِ عربی، تطویل، اعراب و نیم‌فاصله", () => {
    expect(normalizeFa("كنكور")).toBe("کنکور");
    expect(normalizeFa("برنامه‌ريزي")).toBe("برنامه ریزی");
    expect(normalizeFa("کـــنکور")).toBe("کنکور");
    expect(normalizeFa("كُنْكُور")).toBe("کنکور");
    expect(normalizeFa("خانۀ ما")).toBe("خانه ما");
    expect(normalizeFa("آزمون  سراسری")).toBe("ازمون سراسری");
    expect(normalizeFa("إستاد أحمد")).toBe("استاد احمد");
  });
  it("ارقامِ فارسی/عربی → لاتین و علائم → فاصله", () => {
    expect(normalizeFa("کنکور ۱۴۰۵")).toBe("کنکور 1405");
    expect(normalizeFa("٢٤ ساعت")).toBe("24 ساعت");
    expect(normalizeFa("Konkur!!، تجربی")).toBe("konkur تجربی");
  });
  it("توکن‌ها بدونِ کلماتِ ربطی", () => {
    expect(tokenize("برنامه برای کنکور و امتحان")).toEqual(["برنامه", "کنکور", "امتحان"]);
  });
});

describe("فاصله و شباهت", () => {
  it("دامرو-لونشتاین با جابه‌جایی و حروفِ هم‌صدا", () => {
    expect(damerauLevenshtein("کنکور", "کنکور")).toBe(0);
    expect(damerauLevenshtein("کنکر", "کنکور")).toBe(1);
    expect(damerauLevenshtein("کنوکر", "کنکور")).toBe(1); // جابه‌جایی
    expect(damerauLevenshtein("کنگور", "کنکور")).toBe(0.5); // ک/گ هم‌صدا
    expect(damerauLevenshtein("abc", "xyz", 1)).toBe(2); // قطعِ زودهنگام
  });
  it("شباهتِ سه‌حرفی", () => {
    expect(trigramSimilarity("بدنسازی", "بدنسازی")).toBe(1);
    expect(trigramSimilarity("بدنسازی", "تغذیه")).toBe(0);
  });
  it("tokenSimilarity: برابر > پیشوند > غلطِ املایی، و کلمه‌ی کوتاه سخت‌گیرانه", () => {
    expect(tokenSimilarity("کنکور", "کنکور")).toBe(1);
    expect(tokenSimilarity("بدنس", "بدنسازی")).toBeGreaterThan(0.85);
    expect(tokenSimilarity("کنکر", "کنکور")).toBeGreaterThan(0.6);
    expect(tokenSimilarity("کنکورر", "کنکور")).toBeGreaterThan(0.6);
    expect(tokenSimilarity("کنگور", "کنکور")).toBeGreaterThan(0.7);
    expect(tokenSimilarity("رژ", "رز")).toBe(0);
    expect(tokenSimilarity("کنکور", "تغذیه")).toBe(0);
    // دو خطا با حرفِ اولِ متفاوت دیگر «غلطِ املایی» حساب نمی‌شود («کنکر» منتورِ «منتوری» را نمی‌آورد)
    expect(tokenSimilarity("کنکوری", "منتوری")).toBe(0);
  });
});

describe("هم‌معنی‌ها", () => {
  it("کنکور ↔ آزمون سراسری و فینگلیش", () => {
    const forms = expandSynonyms("کنکور").map((a) => a.tokens.join(" "));
    expect(forms).toContain("ازمون سراسری");
    expect(expandSynonyms("konkur").map((a) => a.tokens.join(" "))).toContain("کنکور");
    // غلطِ املایی هم گروه را پیدا می‌کند
    expect(expandSynonyms("کنکر").map((a) => a.tokens.join(" "))).toContain("کنکور");
  });
  it("عبارتِ دوکلمه‌ایِ هم‌معنی یک ترم است", () => {
    expect(parseQuery("آزمون سراسری").terms).toHaveLength(1);
  });
});

describe("relevance روی منتورهای نمونه", () => {
  it.each([
    ["کنکور"], ["کنکر"], ["کنکورر"], ["کنگور"], ["كنكور"], ["konkur"], ["آزمون سراسری"], ["برنامه‌ریزی کنکور"],
    ["برنامه ريزي كنكور"], ["برنامهریزی کنکور"],
  ])("«%s» → منتورِ کنکور اول است", (q) => {
    const h = hits(q);
    expect(h[0]).toBe("konkur");
    expect(h).not.toContain("fitness");
  });
  it.each([["بدنسازی"], ["بدن سازی"], ["بدنصازی"], ["فیتنس"], ["باشگاه"], ["gym"], ["بدنس"]])("«%s» → فقط مربیِ بدنسازی", (q) => {
    expect(hits(q)).toEqual(["fitness"]);
  });
  it("تغذیه ↔ رژیم/کالری (از روی دسته‌ی NUTRITION)", () => {
    expect(hits("رژیم")).toEqual(["fitness"]);
    expect(hits("کالری")).toEqual(["fitness"]);
  });
  it("ریاضی ↔ حسابان/هندسه", () => {
    expect(hits("حسابان")[0]).toBe("math");
    expect(hits("ریاضی")).toContain("math");
    // هم‌معنی متقارن است: منتورِ کنکوری که «ریاضی» دارد هم می‌آید، ولی بعد از متخصصِ هندسه
    expect(hits("هندسه")[0]).toBe("math");
  });
  it("نام با غلطِ املایی", () => {
    expect(hits("نگار کریمی")).toEqual(["konkur"]);
    expect(hits("نگار کرمی")).toEqual(["konkur"]);
    expect(hits("رضائی")).toEqual(["fitness"]);
  });
  it("عبارتِ بی‌ربط هیچ منتوری را نمی‌آورد", () => {
    expect(hits("آشپزی")).toEqual([]);
    expect(hits("گیتار")).toEqual([]);
    expect(hits("xyzxyz")).toEqual([]);
  });
  it("عبارتِ خالی فیلترِ متنی ندارد", () => {
    expect(relevance(parseQuery("   "), konkur)).toBe(1);
  });
});

describe("blendScore", () => {
  it("مرتبط‌بودن غالب است", () => {
    // منتورِ دقیقاً مرتبط با شایستگیِ صفر جلوی منتورِ کم‌ربط با شایستگیِ کامل
    expect(blendScore(1, 0)).toBeGreaterThan(blendScore(0.5, 100));
    expect(blendScore(0.9, 80)).toBeGreaterThan(blendScore(0.9, 20));
  });
});

describe("filtersFromParams — نام‌های پارامترِ نسخه‌ی ردیف‌های افقی", () => {
  const isCat = (v: string) => v === "FITNESS" || v === "ROUTINE" || v === "NUTRITION";
  it("accepting=1 همان open=1 است و category همان cat", () => {
    const f = filtersFromParams(new URLSearchParams("accepting=1&category=FITNESS"), isCat);
    expect(f.open).toBe(true);
    expect(f.category).toBe("FITNESS");
    expect(filtersToParams(f).toString()).toBe("cat=FITNESS&open=1");
  });
});
