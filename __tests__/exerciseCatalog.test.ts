import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  EXERCISE_CATALOG,
  MOVEMENT_PATTERNS,
  MUSCLE_KEYS,
  exerciseNameKey,
  getExerciseDifficulty,
  getExerciseEquipment,
} from "@/lib/exerciseCatalog";
import { LEGACY_ALIASES } from "@/lib/exerciseCatalogData/legacyAliases";
import { computeDayFocus, findCatalogEntry, getCatalogSubstitutes } from "@/lib/exerciseCatalogUtils";

// اسم 149 حرکت اولیه — عکس‌های ادمین و برنامه‌های ذخیره‌شده با همین متن
// دقیق وصل‌ان، پس هیچ‌کدوم نباید عوض یا حذف بشه.
const ORIGINAL_NAMES = [
  "اسکوات هالتر", "اسکوات گابلت", "اسکوات پا جلو", "اسکوات وزن بدن", "اسکوات سومو", "هاک اسکوات",
  "لانج با دمبل", "لانج بلغاری", "لانج", "ددلیفت", "ددلیفت رومانیایی", "ددلیفت سومو", "ددلیفت تک‌پا",
  "هیپ تراست", "هیپ تراست هالتر", "هایپراکستنشن", "پرس پا", "لگ اکستنشن", "لگ کرل", "ساق پا ایستاده",
  "ساق پا نشسته", "ساق پا", "پرس سینه هالتر", "پرس سینه با دمبل", "پرس سینه دمبل", "پرس سینه اسمیت",
  "پرس شیب‌دار دمبل", "پرس شیب‌دار هالتر", "فلای دمبل", "فلای سیم‌کش", "شنا سوئدی", "شنا سوئدی روی زانو",
  "دیپ", "دیپ وزنه‌دار", "زیربغل هالتر خم", "زیربغل هالتر", "زیربغل با کش", "زیربغل تک‌دست دمبل",
  "زیربغل تی-بار", "زیربغل سیمکش", "زیربغل لت", "پول‌اور", "بارفیکس", "بارفیکس یا کول‌آپ",
  "بارفیکس وزنه‌دار", "کول‌آپ کمکی", "پرس سرشانه هالتر", "پرس سرشانه با دمبل", "پرس سرشانه دمبل",
  "پرس سرشانه دمبل سبک", "پرس آرنولد", "نشر جانبی دمبل", "نشر جانبی", "نشر جانبی سیم‌کش", "نشر خم به جلو",
  "فیس‌پول", "شراگ هالتر", "شراگ دمبل", "جلوبازو دمبل", "جلوبازو هالتر", "جلوبازو لاری", "جلوبازو چکشی",
  "جلوبازو سیم‌کش", "پشت‌بازو سیمکش", "پشت بازو هالتر خوابیده", "پشت بازو دمبل تک‌دست", "پشت بازو روی نیمکت",
  "مچ دست هالتر", "پلانک", "پلانک بارگذاری‌شده", "پلانک جانبی", "کرانچ", "کرانچ سیم‌کش", "زانو بغل معلق",
  "راشین تویست", "برپی", "پرش جعبه", "اسکوات جامپ", "تناوبی دویدن", "طناب زدن", "دویدن آرام", "دویدن تمپو",
  "دویدن یا دوچرخه", "دوچرخه ثابت", "پیاده‌روی تند یا دوی سبک", "کشش کامل بدن", "باکس اسکوات", "لانج معکوس",
  "لانج پیاده‌روی", "گابلت لانج", "استپ آپ", "سیسی اسکوات", "گود مورنینگ", "پول-ترو سیم‌کش", "کیک‌بک باسن",
  "هیپ اداکشن دستگاه", "هیپ ابداکشن دستگاه", "پرس پا تک‌پا", "ساق پا خم", "ساق پا با دستگاه پرس پا",
  "پرس سینه دستگاه", "پک دک (فلای دستگاه)", "پرس سینه شیب‌دار دستگاه", "فلای دمبل شیب‌دار", "کراس‌اور سیم‌کش",
  "زیربغل دستگاه نشسته", "پول‌داون نزدیک", "زیربغل معکوس سیمکش", "رک پول", "پرس سرشانه دستگاه",
  "پرس سرشانه اسمیت", "نشر جانبی دستگاه", "نشر خم به جلو سیم‌کش", "آپ‌رایت رو", "پرس لندماین",
  "جلوبازو کانسنتریشن", "جلوبازو روی نیمکت شیب‌دار", "جلوبازو دستگاه", "پشت بازو دستگاه",
  "پشت بازو دیپ روی دستگاه", "کیک‌بک پشت بازو", "مچ دست معکوس", "فارمر واک", "کوهنورد", "کوهنورد آهسته",
  "چرخ شکم", "دد باگ", "بردباره", "قایقی (روئینگ) دستگاه", "الپتیکال", "پله‌نوردی", "شنا (استخر)",
  "طناب‌زنی سنگین (بتل‌روپ)", "کتل‌بل سوئینگ", "جامپینگ جک", "های‌نیز", "کشش همسترینگ نشسته",
  "کشش چهارسر ایستاده", "کبوتر (یوگا)", "کشش سرشانه پشت بدن", "فوم رولینگ", "پرس سینه دست جمع",
  "پرس سینه دکلاین", "اسکوات تک‌پا", "پروانه معکوس دمبل", "پروانه معکوس دستگاه", "دراز و نشست",
  "بالا آوردن پا خوابیده", "کرانچ معکوس",
];

const DIACRITICS = /[ً-ْٰٕٔ]/;
const FORBIDDEN_ALEF = /[أإ]/;
const PERSIAN_DIGITS = /[۰-۹٠-٩]/;

function allText(e: (typeof EXERCISE_CATALOG)[number]): string {
  return [e.name, e.muscleGroup, e.benefits, ...e.howTo, ...(e.aliases ?? [])].join("\n");
}

describe("کاتالوگ حرکات", () => {
  it("حداقل 700 حرکت دارد", () => {
    expect(EXERCISE_CATALOG.length).toBeGreaterThanOrEqual(700);
  });

  it("هیچ دو حرکتی اسم یکسان (بعد از یکسان‌سازی فاصله/نیم‌فاصله/ی ک) ندارند", () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    for (const e of EXERCISE_CATALOG) {
      const k = exerciseNameKey(e.name);
      if (seen.has(k)) dups.push(`${seen.get(k)} = ${e.name}`);
      seen.set(k, e.name);
    }
    expect(dups).toEqual([]);
  });

  it("اسم دیگه‌ی هر حرکت با اسم یا اسم دیگه‌ی حرکت دیگری یکی نیست", () => {
    const owner = new Map<string, string>();
    for (const e of EXERCISE_CATALOG) owner.set(exerciseNameKey(e.name), e.name);
    const clashes: string[] = [];
    for (const e of EXERCISE_CATALOG) {
      for (const a of e.aliases ?? []) {
        const k = exerciseNameKey(a);
        const o = owner.get(k);
        if (o && o !== e.name) clashes.push(`${a} (${e.name} / ${o})`);
        owner.set(k, e.name);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("همه‌ی 149 اسم اولیه دقیقا (بدون تغییر) هنوز هستند", () => {
    expect(ORIGINAL_NAMES.length).toBe(149);
    const names = new Set(EXERCISE_CATALOG.map((e) => e.name));
    expect(ORIGINAL_NAMES.filter((n) => !names.has(n))).toEqual([]);
    // و اسم‌های دیگه‌ی اولیه به حرکت موجودی اشاره می‌کنن
    expect(Object.keys(LEGACY_ALIASES).filter((n) => !names.has(n))).toEqual([]);
  });

  it("هر حرکت عضله/الگوی معتبر، حداقل 3 قدم و مزیت دارد", () => {
    const bad: string[] = [];
    for (const e of EXERCISE_CATALOG) {
      const ok =
        e.name.trim().length > 0 &&
        e.muscleGroup.trim().length > 0 &&
        e.muscleKeys.length > 0 &&
        new Set(e.muscleKeys).size === e.muscleKeys.length &&
        e.muscleKeys.every((k) => MUSCLE_KEYS.includes(k)) &&
        MOVEMENT_PATTERNS.includes(e.pattern) &&
        e.howTo.length >= 3 &&
        e.howTo.every((s) => s.trim().length > 5) &&
        e.benefits.trim().length > 5 &&
        (e.level === undefined || (e.level >= 1 && e.level <= 5));
      if (!ok) bad.push(e.name);
    }
    expect(bad).toEqual([]);
  });

  it("هیچ متنی اعراب، «أ»/«إ» یا رقم فارسی ندارد", () => {
    const bad = EXERCISE_CATALOG.filter((e) => {
      const t = allText(e);
      return DIACRITICS.test(t) || FORBIDDEN_ALEF.test(t) || PERSIAN_DIGITS.test(t);
    }).map((e) => e.name);
    expect(bad).toEqual([]);
  });

  it("فایل‌های دیتا هم (کامنت‌ها) اعراب و «أ»/«إ» ندارند", () => {
    const dir = join(__dirname, "..", "lib", "exerciseCatalogData");
    const files = ["legacy", "legacyAliases", "build", "legs", "chest", "back", "shoulders", "arms", "core", "cardio", "mobility", "power", "extra"];
    for (const f of files) {
      const src = readFileSync(join(dir, `${f}.ts`), "utf8");
      expect(DIACRITICS.test(src), f).toBe(false);
      expect(FORBIDDEN_ALEF.test(src), f).toBe(false);
    }
  });

  it("سختی بین 1 تا 5 و تجهیزات برای همه تعیین می‌شود", () => {
    for (const e of EXERCISE_CATALOG) {
      const d = getExerciseDifficulty(e);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(5);
      expect(getExerciseEquipment(e)).toBeTruthy();
    }
    expect(getExerciseEquipment(EXERCISE_CATALOG.find((e) => e.name === "پرس سینه اسمیت")!)).toBe("smith");
    expect(getExerciseEquipment(EXERCISE_CATALOG.find((e) => e.name === "ددلیفت رومانیایی دمبل")!)).toBe("dumbbell");
    expect(getExerciseEquipment(EXERCISE_CATALOG.find((e) => e.name === "کرانچ دوچرخه")!)).toBe("bodyweight");
    expect(getExerciseEquipment(EXERCISE_CATALOG.find((e) => e.name === "اسکوات گابلت")!)).toBe("dumbbell");
  });
});

describe("تطبیق اسم حرکت", () => {
  it("اسم دقیق، نرمال‌شده، انگلیسی و با پسوند ست/تکرار رو پیدا می‌کند", () => {
    expect(findCatalogEntry("اسکوات هالتر")?.name).toBe("اسکوات هالتر");
    expect(findCatalogEntry("اسکوات  هالتر")?.name).toBe("اسکوات هالتر");
    expect(findCatalogEntry("پرس شیب دار دمبل")?.name).toBe("پرس شیب‌دار دمبل");
    expect(findCatalogEntry("Barbell Bench Press")?.name).toBe("پرس سینه هالتر");
    expect(findCatalogEntry("romanian deadlift")?.name).toBe("ددلیفت رومانیایی");
    expect(findCatalogEntry("Face Pull 3×12")?.name).toBe("فیس‌پول");
    expect(findCatalogEntry("حرکتی که وجود ندارد")).toBeUndefined();
  });

  it("تمرکز روز و جایگزین‌ها با اسم‌های جدید و قدیمی کار می‌کنند", () => {
    expect(computeDayFocus(["اسکوات هالتر 3×10", "پرس سینه هالتر 3×8"])).toBe("بدن کامل");
    expect(computeDayFocus(["کرانچ دوچرخه 3×20", "هالو هولد 30 ثانیه"])).toBe("شکم و مرکز بدن");
    const subs = getCatalogSubstitutes("لانج بلغاری 3×10", 3);
    expect(subs).toHaveLength(3);
    expect(subs.every((s) => s.endsWith(" 3×10"))).toBe(true);
    expect(getCatalogSubstitutes("Goblet Squat 3×12", 3)).toHaveLength(3);
  });
});
