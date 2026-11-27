// شاخص توده بدنی (BMI) — منطق خالص، بدون React. دسته‌بندی طبق جدول سازمان جهانی بهداشت (WHO)
// برای بزرگسالان. برای کودکان، نوجوانان، ورزشکاران عضلانی و زنان باردار معنی ندارد.

import { tr } from "./i18n";

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese1" | "obese2" | "obese3";

/** مرز پایین و بالای محدوده‌ی وزن سالم (BMI) */
export const HEALTHY_BMI_MIN = 18.5;
export const HEALTHY_BMI_MAX = 24.9;

/** BMI = وزن (کیلوگرم) تقسیم بر مجذور قد (متر)؛ ورودی نامعتبر → null */
export function calcBmi(heightCm: number, weightKg: number): number | null {
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null;
  if (heightCm <= 0 || weightKg <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** گرد کردن نمایشی به یک رقم اعشار */
export function roundBmi(bmi: number): number {
  return Math.round(bmi * 10) / 10;
}

/** دسته‌بندی WHO روی مقدار گردشده‌ی یک‌رقمی (همان عددی که کاربر می‌بیند) */
export function bmiCategory(bmi: number): BmiCategory {
  const v = roundBmi(bmi);
  if (v < 18.5) return "underweight";
  if (v < 25) return "normal";
  if (v < 30) return "overweight";
  if (v < 35) return "obese1";
  if (v < 40) return "obese2";
  return "obese3";
}

export function bmiCategoryLabel(c: BmiCategory): string {
  switch (c) {
    case "underweight": return tr("کمبود وزن", "Underweight");
    case "normal": return tr("وزن طبیعی", "Normal weight");
    case "overweight": return tr("اضافه وزن", "Overweight");
    case "obese1": return tr("چاقی درجه 1", "Obesity class I");
    case "obese2": return tr("چاقی درجه 2", "Obesity class II");
    case "obese3": return tr("چاقی درجه 3", "Obesity class III");
  }
}

/** محدوده‌ی وزن سالم (BMI بین 18.5 و 24.9) برای یک قد، به کیلوگرم با یک رقم اعشار */
export function healthyWeightRange(heightCm: number): { minKg: number; maxKg: number } | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  const m2 = (heightCm / 100) ** 2;
  return {
    minKg: Math.round(HEALTHY_BMI_MIN * m2 * 10) / 10,
    maxKg: Math.round(HEALTHY_BMI_MAX * m2 * 10) / 10,
  };
}

/**
 * فاصله تا محدوده‌ی سالم: مثبت یعنی باید اضافه شود، منفی یعنی باید کم شود، صفر یعنی داخل محدوده.
 * مقدار برحسب کیلوگرم با یک رقم اعشار.
 */
export function kgToHealthy(heightCm: number, weightKg: number): number | null {
  const r = healthyWeightRange(heightCm);
  if (!r || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (weightKg < r.minKg) return Math.round((r.minKg - weightKg) * 10) / 10;
  if (weightKg > r.maxKg) return -Math.round((weightKg - r.maxKg) * 10) / 10;
  return 0;
}
