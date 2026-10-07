// شاخص توده بدنی (BMI) — منطق خالص. دسته‌بندی بر اساس جدول سازمان جهانی بهداشت
// برای بزرگسالان؛ برای کودکان و نوجوانان یا ورزشکاران عضلانی معیار دقیقی نیست.

export type BmiCategoryKey = "under" | "normal" | "over" | "obese1" | "obese2" | "obese3";

export type BmiCategory = { key: BmiCategoryKey; label: string; from: number; to: number };

export const BMI_CATEGORIES: BmiCategory[] = [
  { key: "under", label: "کم‌وزن", from: 0, to: 18.5 },
  { key: "normal", label: "وزن طبیعی", from: 18.5, to: 25 },
  { key: "over", label: "اضافه‌وزن", from: 25, to: 30 },
  { key: "obese1", label: "چاقی درجه 1", from: 30, to: 35 },
  { key: "obese2", label: "چاقی درجه 2", from: 35, to: 40 },
  { key: "obese3", label: "چاقی درجه 3", from: 40, to: Infinity },
];

export const BMI_NORMAL_MIN = 18.5;
export const BMI_NORMAL_MAX = 24.9;

export type BmiResult =
  | { ok: true; bmi: number; category: BmiCategory; minKg: number; maxKg: number; diffKg: number }
  | { ok: false; error: string };

const fin = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export function bmiCategory(bmi: number): BmiCategory {
  return BMI_CATEGORIES.find((c) => bmi < c.to) ?? BMI_CATEGORIES[BMI_CATEGORIES.length - 1];
}

/**
 * diffKg: چقدر تا بازه‌ی وزن طبیعی فاصله دارد (منفی = باید کم شود، مثبت = باید زیاد شود،
 * صفر = داخل بازه).
 */
export function calcBmi(heightCm: number, weightKg: number): BmiResult {
  if (!fin(heightCm) || heightCm < 100 || heightCm > 250) return { ok: false, error: "قد را بین 100 تا 250 سانتی‌متر وارد کن" };
  if (!fin(weightKg) || weightKg < 20 || weightKg > 400) return { ok: false, error: "وزن را بین 20 تا 400 کیلوگرم وارد کن" };
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  const minKg = BMI_NORMAL_MIN * m * m;
  const maxKg = BMI_NORMAL_MAX * m * m;
  const diffKg = weightKg < minKg ? minKg - weightKg : weightKg > maxKg ? maxKg - weightKg : 0;
  return { ok: true, bmi, category: bmiCategory(bmi), minKg, maxKg, diffKg };
}

/** موقعیت نشانگر روی مقیاس 15 تا 40 (درصد 0..100) */
export function bmiScalePercent(bmi: number): number {
  const lo = 15, hi = 40;
  return Math.max(0, Math.min(100, ((bmi - lo) / (hi - lo)) * 100));
}
