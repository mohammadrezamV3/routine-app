import { tr } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { clampText, parseIsoDate } from "@/lib/validate";
import { checkNumber, hasNumberValue } from "@/lib/numberLimits";

// اعتبارسنجی و ساخت یک ردیف غذای ثبت‌شده — تک‌منبع مشترک بین
// POST /api/calorie/log و دستیار نومو.

export type FoodLogData = {
  date: Date; customName: string; customCalories: number; grams: number; mealType: string | null;
  macros: { proteinG: number; carbsG: number; fatG: number } | null;
};

/** رشته = پیام خطا */
export function parseFoodLogInput(body: any): string | FoodLogData {
  if (!body || typeof body !== "object") return tr("اطلاعات ناقص است", "Incomplete information");
  const { customName, mealType } = body as { customName: unknown; mealType?: unknown };
  const date = parseIsoDate(body.date);
  if (!date) return tr("تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)", "Invalid date (format: YYYY-MM-DD)");
  if (!customName || typeof customName !== "string" || !hasNumberValue(body.customCalories) || !hasNumberValue(body.grams)) {
    return tr("اطلاعات ناقص است", "Incomplete information");
  }
  // سقف و کف همه‌ی عددها از جدول مشترک (lib/numberLimits.ts)
  const kcal = checkNumber(body.customCalories, "entryKcal");
  if (!kcal.ok) return kcal.error;
  const gramsCheck = checkNumber(body.grams, "foodGrams");
  if (!gramsCheck.ok) return gramsCheck.error;
  // نوع وعده enum ثابت نیست (چیدمان وعده‌ها رو خود کاربر تعیین می‌کنه)؛ فقط طول رشته
  if (mealType && (typeof mealType !== "string" || mealType.length > 20)) {
    return tr("نوع وعده نامعتبر است", "Invalid meal type");
  }
  // درشت‌مغذی‌ها: یا هر سه با هم میان یا هیچ‌کدوم؛ هر کدوم عدد نامنفی توی بازه.
  const rawMacros = [body.proteinG, body.carbsG, body.fatG];
  let macros: FoodLogData["macros"] = null;
  if (rawMacros.some((v) => v !== undefined)) {
    const checks = rawMacros.map((v) => checkNumber(v, "macroEntryG"));
    const bad = checks.find((c) => !c.ok);
    if (bad && !bad.ok) return bad.error;
    const [p, c, f] = checks.map((c) => (c.ok ? c.value : 0));
    macros = { proteinG: p, carbsG: c, fatG: f };
  }
  return {
    date, customName: clampText(customName, 80), customCalories: kcal.value, grams: gramsCheck.value,
    mealType: (mealType as string | undefined) || null, macros,
  };
}

export async function createFoodLog(userId: string, d: FoodLogData) {
  return prisma.foodLogEntry.create({
    data: {
      userId, date: d.date, customName: d.customName, customCalories: d.customCalories, grams: d.grams, mealType: d.mealType,
      ...(d.macros ?? {}),
    },
  });
}
