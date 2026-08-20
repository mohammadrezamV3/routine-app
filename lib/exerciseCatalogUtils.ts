// توابعی که به کاتالوگِ کاملِ حرکات (`lib/exerciseCatalog.ts`، ~۸۵KB دیتا)
// نیاز دارن. عمداً از `lib/exercisePlans.ts` جدا شدن: اون ماژول typeهای
// سبکی مثل `ExerciseDay` رو صادر می‌کنه که چندین کامپوننتِ کلاینتی وارد
// می‌کنن — تا وقتی کاتالوگ اون‌جا import می‌شد، کلِ اون ۸۵KB توی باندلِ
// صفحه‌ی /exercise می‌نشست، حتی برای کاربری که هیچ‌وقت لیستِ حرکات یا فرمِ
// ساختِ دستی رو باز نمی‌کنه.

import { EXERCISE_CATALOG, MuscleKey } from "./exerciseCatalog";
import { stripSetSuffix } from "./exerciseSets";

// سه حرکتِ جایگزینِ آماده (بدونِ هوش‌مصنوعی) — از کاتالوگِ حرکات
// (lib/exerciseCatalog.ts) حرکاتی با همون الگوی حرکتی (اولویت) یا هم‌پوشانیِ
// گروهِ عضلانی رو پیدا می‌کنه، سه‌تای برتر رو با همون پسوندِ ست/تکرار یا
// زمانِ حرکتِ اصلی برمی‌گردونه — کاربر خودش انتخاب می‌کنه، نه سوییچِ خودکار.
const UPPER_KEYS: MuscleKey[] = ["chest", "back", "traps", "shoulders", "biceps", "triceps", "forearms"];
const LOWER_KEYS: MuscleKey[] = ["glutes", "quads", "hamstrings", "calves"];
const CORE_KEYS: MuscleKey[] = ["abs", "obliques"];

/** «تمرکزِ امروز» رو خودِ سیستم از روی حرکاتِ اضافه‌شده تشخیص می‌ده (نه اینکه
 * کاربر تایپ کنه) — بر اساسِ گروهِ عضلانیِ غالب در حرکاتِ همون روز. */
export function computeDayFocus(items: string[]): string {
  const cats = new Set<"upper" | "lower" | "core" | "cardio" | "flex" | "full">();
  for (const item of items) {
    const entry = EXERCISE_CATALOG.find((e) => e.name === stripSetSuffix(item));
    if (!entry) continue;
    if (entry.muscleKeys.includes("fullbody")) cats.add("full");
    if (entry.muscleKeys.some((k) => UPPER_KEYS.includes(k))) cats.add("upper");
    if (entry.muscleKeys.some((k) => LOWER_KEYS.includes(k))) cats.add("lower");
    if (entry.muscleKeys.some((k) => CORE_KEYS.includes(k))) cats.add("core");
    if (entry.muscleKeys.includes("cardio")) cats.add("cardio");
    if (entry.muscleKeys.includes("flexibility")) cats.add("flex");
  }
  if (cats.size === 0) return "برنامه‌ی شخصی";
  if (cats.has("full") || (cats.has("upper") && cats.has("lower")) || cats.size >= 3) return "بدن کامل";
  if (cats.size === 1) {
    const [only] = cats;
    return only === "upper" ? "بالاتنه"
      : only === "lower" ? "پایین‌تنه"
      : only === "core" ? "شکم و مرکز بدن"
      : only === "cardio" ? "کاردیو"
      : "انعطاف‌پذیری";
  }
  return "ترکیبی";
}

// excludeNames: اسمِ (بدونِ پسوندِ ست/تکرار) بقیه‌ی حرکاتِ همون روز — وگرنه
// پیشنهاد ممکنه دقیقاً یکی از حرکاتِ از‌قبل‌توی‌برنامه رو برگردونه؛ جایگزینی
// با اون فقط یه هم‌نامِ تکراری می‌سازه (حرکتِ قدیمی درست حذف می‌شه ولی یه
// کپیِ دیگه از یه حرکتِ دیگه‌ی برنامه به‌جاش میاد)، نه یه جایگزینِ واقعاً جدید.
export function getCatalogSubstitutes(item: string, max = 3, excludeNames: string[] = []): string[] {
  const baseName = stripSetSuffix(item);
  const suffix = item.startsWith(baseName) ? item.slice(baseName.length) : "";
  const source = EXERCISE_CATALOG.find((e) => e.name === baseName);
  if (!source) return [];

  const excluded = new Set([baseName, ...excludeNames]);
  return EXERCISE_CATALOG
    .filter((e) => !excluded.has(e.name))
    .map((e) => {
      const sharedMuscles = e.muscleKeys.filter((k) => source.muscleKeys.includes(k)).length;
      const score = (e.pattern === source.pattern ? 3 : 0) + sharedMuscles;
      return { name: e.name, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.name + suffix);
}
