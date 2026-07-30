// محاسبه‌ی هدف کالری روزانه — یک فرمول قطعی و شناخته‌شده (بدون هوش مصنوعی، چون
// این بخش یک حساب‌وکتاب استانداردِ تغذیه‌ست، نه چیزی که نیاز به تولید متن داشته باشه).

export type CalorieGoal = "lose" | "maintain" | "gain";
export type Sex = "male" | "female";

export const CALORIE_GOAL_LABELS: Record<CalorieGoal, string> = {
  lose: "کاهش وزن",
  maintain: "حفظ وزن",
  gain: "افزایش وزن/عضله",
};

// Mifflin-St Jeor — دقیق‌ترین فرمول رایج BMR بدون نیاز به ابزار تخصصی
function calcBmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

// ضریب فعالیت بر اساس تعداد روزهای باشگاه در هفته (محدوده‌ی رایج NSCA/ACSM)
function activityMultiplier(gymDaysPerWeek: number): number {
  if (gymDaysPerWeek <= 0) return 1.2;
  if (gymDaysPerWeek <= 2) return 1.375;
  if (gymDaysPerWeek <= 4) return 1.55;
  if (gymDaysPerWeek <= 6) return 1.725;
  return 1.9;
}

// تنظیم بر اساس هدف کالری؛ اگه دوره‌ی تمرینی «حجم» بود حتی با هدف «حفظ وزن»
// هم یه‌کم مازاد می‌ذاریم چون حجم بیشتری مصرف می‌کنن
function goalAdjustment(goal: CalorieGoal, trainingPhase?: string | null): number {
  if (goal === "lose") return -0.2;
  if (goal === "gain") return 0.15;
  if (trainingPhase === "bulk") return 0.1;
  if (trainingPhase === "cut") return -0.1;
  return 0;
}

export function calcAge(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}

export function calcDailyTargetKcal(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  gymDaysPerWeek: number;
  goal: CalorieGoal;
  trainingPhase?: string | null;
}): number {
  const bmr = calcBmr(input.sex, input.weightKg, input.heightCm, input.age);
  const tdee = bmr * activityMultiplier(input.gymDaysPerWeek);
  const adjusted = tdee * (1 + goalAdjustment(input.goal, input.trainingPhase));
  return Math.max(1000, Math.round(adjusted / 10) * 10);
}

// واحدهای اندازه‌گیری برای ثبت غذا — همه به گرم تبدیل می‌شن قبل از ارسال،
// چون ذخیره‌سازی و کالریِ هر‌۱۰۰گرم (FoodItem) همیشه بر مبنای گرمه؛ ضریب‌ها
// تقریبی و رایج آشپزی‌ان (نه دقیق آزمایشگاهی)
export type FoodUnit = "gram" | "tsp" | "tbsp" | "cup";
export const UNIT_LABELS: Record<FoodUnit, string> = {
  gram: "گرم",
  tsp: "قاشق چای‌خوری",
  tbsp: "قاشق غذاخوری",
  cup: "پیمانه",
};
export const UNIT_TO_GRAMS: Record<FoodUnit, number> = {
  gram: 1,
  tsp: 5,
  tbsp: 15,
  cup: 240,
};

export type MealBreakdownItem = { key: string; label: string; kcal: number };

const MEAL_SPLITS: Record<number, { key: string; label: string; ratio: number }[]> = {
  2: [
    { key: "lunch", label: "ناهار", ratio: 0.45 },
    { key: "dinner", label: "شام", ratio: 0.55 },
  ],
  3: [
    { key: "breakfast", label: "صبحانه", ratio: 0.3 },
    { key: "lunch", label: "ناهار", ratio: 0.4 },
    { key: "dinner", label: "شام", ratio: 0.3 },
  ],
  4: [
    { key: "breakfast", label: "صبحانه", ratio: 0.25 },
    { key: "lunch", label: "ناهار", ratio: 0.3 },
    { key: "dinner", label: "شام", ratio: 0.3 },
    { key: "snack", label: "میان‌وعده", ratio: 0.15 },
  ],
  5: [
    { key: "breakfast", label: "صبحانه", ratio: 0.22 },
    { key: "lunch", label: "ناهار", ratio: 0.26 },
    { key: "dinner", label: "شام", ratio: 0.26 },
    { key: "snack1", label: "میان‌وعده ۱", ratio: 0.13 },
    { key: "snack2", label: "میان‌وعده ۲", ratio: 0.13 },
  ],
  6: [
    { key: "breakfast", label: "صبحانه", ratio: 0.2 },
    { key: "snack1", label: "میان‌وعده ۱", ratio: 0.1 },
    { key: "lunch", label: "ناهار", ratio: 0.25 },
    { key: "snack2", label: "میان‌وعده ۲", ratio: 0.1 },
    { key: "dinner", label: "شام", ratio: 0.25 },
    { key: "snack3", label: "میان‌وعده ۳", ratio: 0.1 },
  ],
};

export function splitMeals(dailyTargetKcal: number, mealsPerDay: number): MealBreakdownItem[] {
  const clamped = Math.min(6, Math.max(2, Math.round(mealsPerDay)));
  const split = MEAL_SPLITS[clamped];
  const items = split.map((s) => ({ key: s.key, label: s.label, kcal: Math.round((dailyTargetKcal * s.ratio) / 10) * 10 }));

  // گردکردن هر وعده ممکنه جمع کل رو کمی جابه‌جا کنه — اختلاف رو به بزرگ‌ترین وعده می‌زنیم
  const sum = items.reduce((s, i) => s + i.kcal, 0);
  const diff = dailyTargetKcal - sum;
  if (diff !== 0) {
    const maxIdx = items.reduce((best, it, i) => (it.kcal > items[best].kcal ? i : best), 0);
    items[maxIdx] = { ...items[maxIdx], kcal: items[maxIdx].kcal + diff };
  }
  return items;
}
