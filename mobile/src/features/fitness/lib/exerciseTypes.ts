import type { ExerciseDay, ExerciseLevel } from "./exercisePlans";

// نسخه‌ی موبایل/آفلاینِ ExercisePlan — همون فیلدهای وب (prisma/schema.prisma
// → model ExercisePlan) به‌علاوه‌ی چهار فیلدِ sync (updatedAt/deletedAt/dirty
// + serverUpdatedAt برای LWW). id همیشه محلیه ('m' + uuid بدون خط‌تیره)؛
// اتصال به رکوردِ سرور از طریقِ همین id انجام می‌شه (سرور هم همین id رو
// نگه می‌داره، نه cuid خودش را دوباره می‌سازد) — دقیقا مثل بقیه‌ی جدول‌های
// sync موبایل.
export type ExercisePlanRow = {
  id: string;
  level: ExerciseLevel | "custom";
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
  hasPhysicalLimitation: boolean;
  gymDays: string[] | null;
  trainingPhase: string | null;
  trainingMonth: number | null;
  equipment: string | null;
  generatedByAi: boolean;
  startDate: string; // ISO
  isActive: boolean;
  planData: ExerciseDay[];
  createdAt: string;
  /** لحظه‌ی پذیرفتنِ قوانین/سلبِ مسئولیت — سرور بدونِ اون برنامه‌ی دستیِ جدید رو نمی‌سازه (rulesAccepted) */
  rulesAcceptedAt?: string | null;
  updatedAt: string;
  /** فقط محلی: «حذف» = آرشیو. سرور حذفِ برنامه نداره؛ push به‌صورتِ isActive=false می‌ره */
  deletedAt: string | null;
  dirty: 0 | 1;
};

export type ExerciseLogRow = {
  id: string;
  planId: string | null;
  date: string; // yyyy-mm-dd (isoLocal)
  completed: boolean;
  completedItems: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
};

// ثبتِ ست‌به‌ست (تعدادِ تکرار/وزنِ واقعیِ انجام‌شده) — چیزی که وب فقط در
// لحظه نشون می‌ده و ذخیره نمی‌کنه؛ این‌جا برای تاریخچه/پیشرفتِ وزنه نگه
// داشته می‌شه. itemKey = نامِ پایه‌ی حرکت (stripSetSuffix).
export type SetLogRow = {
  id: string;
  planId: string;
  date: string; // yyyy-mm-dd
  itemKey: string;
  setIndex: number;
  reps: number | null;
  weightKg: number | null;
  seconds: number | null; // برای حرکاتِ زمان‌محور
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type CalorieEntryRow = {
  id: string;
  // اگه از کاتالوگ داخلی/غذای سفارشی انتخاب شده، اسمش این‌جا snapshot می‌شه
  // (نه فقط ارجاع) — همون قرارداد «فیلدهای اسنپ‌شات‌شده در سایر ماژول‌ها
  // بعدا دست‌نخورده می‌مونن».
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  grams: number;
  date: string; // yyyy-mm-dd
  mealType: MealType | null;
  aiScanned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
};

export type MealBreakdownItem = { key: string; label: string; kcal: number };

export type CalorieTargetRow = {
  id: string;
  dailyTargetKcal: number;
  goal: "lose" | "maintain" | "gain" | null;
  mealsPerDay: number | null;
  mealBreakdown: MealBreakdownItem[] | null;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
  sex: "male" | "female" | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  /** سرور این هدف رو می‌شناسه (از pull اومده یا compute شده) — push بعدی از نوعِ meals می‌ره نه compute */
  synced?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
};

export type CustomFoodRow = {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
};
