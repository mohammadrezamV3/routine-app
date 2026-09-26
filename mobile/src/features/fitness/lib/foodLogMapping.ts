// تبدیلِ ثبتِ غذا بینِ شکلِ محلی و شکلِ وب/سرور — یک نسخه برای هر دو مسیر:
//   • ردیفِ محلیِ calorieEntries «به‌ازای ۱۰۰ گرم» نگه می‌داره (caloriesPer100g/…Per100g)
//   • FoodLogEntry ِ وب/سرور «کلِ همین مقدار» (customCalories/proteinG/carbsG/fatG)
// مصرف‌کننده‌ها: آداپتورِ سینک (sync/fitnessAdapter.ts ← push/pull) و هندلرهای
// محلیِ /api/calorie/log (localApi/handlers/calorie.ts ← POST و شکلِ پاسخِ GET).
//
// per100 گرد نمی‌شه (قبلا round1 بود): کالریِ کلی که وب فرستاده باید عینا همون
// عدد برگرده — `per100 = total*100/g` و `total = per100*g/100` با پاک‌کردنِ نویزِ
// ممیزِ شناور (۶ رقمِ اعشار) رفت‌وبرگشتِ دقیق می‌ده (۲۵۰ کالری/۱۵۰ گرم ← ۲۵۰، نه ۲۴۹٫۹۹…).
import type { CalorieEntryRow } from "./exerciseTypes";

/** پاک‌کردنِ نویزِ ممیزِ شناور (0.1*3 ← 0.3) — دقتِ ۶ رقمِ اعشار برای کالری/گرم کافیه */
export function cleanNumber(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export type FoodTotals = {
  customCalories: number;
  /** یا هر سه عدد، یا هر سه null (همون قاعده‌ی POSTِ وب) */
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type FoodPer100 = Pick<CalorieEntryRow, "caloriesPer100g" | "proteinPer100g" | "carbsPer100g" | "fatPer100g">;

export function rowHasMacros(row: FoodPer100): boolean {
  return row.proteinPer100g != null && row.carbsPer100g != null && row.fatPer100g != null;
}

/** ردیفِ محلی (به‌ازای ۱۰۰ گرم) ← مقادیرِ کلِ همین ثبت */
export function foodTotals(row: FoodPer100 & Pick<CalorieEntryRow, "grams">): FoodTotals {
  const f = row.grams / 100;
  const macros = rowHasMacros(row);
  return {
    customCalories: cleanNumber(row.caloriesPer100g * f),
    proteinG: macros ? cleanNumber(row.proteinPer100g! * f) : null,
    carbsG: macros ? cleanNumber(row.carbsPer100g! * f) : null,
    fatG: macros ? cleanNumber(row.fatPer100g! * f) : null,
  };
}

/** مقادیرِ کل (وب/سرور) ← به‌ازای ۱۰۰ گرم برای ردیفِ محلی. گرمِ صفر (tombstoneِ سرور) ← ۰/null */
export function per100FromTotals(t: {
  customCalories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  grams: number;
}): FoodPer100 {
  const per = (total: number | null) => (total != null && t.grams > 0 ? (total * 100) / t.grams : null);
  return {
    caloriesPer100g: per(t.customCalories) ?? 0,
    proteinPer100g: per(t.proteinG),
    carbsPer100g: per(t.carbsG),
    fatPer100g: per(t.fatG),
  };
}
