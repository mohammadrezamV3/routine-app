// خروجی ردیف‌های FoodLogEntry: داده‌ی قدیمی خارج از بازه (مثلا ده میلیارد کالری
// که قبل از اعمال سقف ثبت شده) فقط موقع خروجی گیره می‌شه تا جمع روز، نمودارها و
// داشبورد نترکن؛ ردیف دیتابیس دست نمی‌خوره (خوندنش هیچ‌وقت نباید کرش کنه).

import { clampDisplay } from "./numberLimits";

export type FoodRowNumbers = {
  customCalories: number | null;
  grams: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export function sanitizeFoodRow<T extends FoodRowNumbers>(e: T): T {
  return {
    ...e,
    customCalories: e.customCalories == null ? e.customCalories : clampDisplay(e.customCalories, "entryKcal"),
    grams: clampDisplay(e.grams, "foodGrams"),
    proteinG: e.proteinG == null ? e.proteinG : clampDisplay(e.proteinG, "macroEntryG"),
    carbsG: e.carbsG == null ? e.carbsG : clampDisplay(e.carbsG, "macroEntryG"),
    fatG: e.fatG == null ? e.fatG : clampDisplay(e.fatG, "macroEntryG"),
  };
}

/** جمع کالری یک روز برای نمایش: خراب/نامتناهی نشه و از سقف نمایش رد نشه */
export function safeDailyKcal(sum: unknown): number {
  return clampDisplay(sum, "dailyKcalDisplay");
}
