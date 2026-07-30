import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { calcAge, calcDailyTargetKcal, splitMeals, CalorieGoal, Sex } from "@/lib/calorieCalc";
import { clampText } from "@/lib/validate";

const VALID_GOALS: CalorieGoal[] = ["lose", "maintain", "gain"];
const VALID_SEX: Sex[] = ["male", "female"];

export async function GET() {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const [target, user] = await Promise.all([
    prisma.calorieTarget.findFirst({ where: { userId, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { birthDate: true } }),
  ]);
  // اگه تاریخ تولد توی حساب کاربری ثبت نشده، فرم باید مستقیم سن رو بپرسه
  return NextResponse.json({ target, needsAge: !user?.birthDate });
}

// POST /api/calorie/target { goal, mealsPerDay, sex, ageYears?, heightCm, weightKg }
// هدف روزانه رو با فرمول Mifflin-St Jeor حساب می‌کنه (نه هوش مصنوعی — این یک
// محاسبه‌ی قطعی تغذیه‌ایه) و بین تعداد وعده‌های خواسته‌شده تقسیم می‌کنه.
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { goal, mealsPerDay, sex, ageYears, heightCm, weightKg } = body as {
    goal: CalorieGoal; mealsPerDay: number; sex: Sex; ageYears?: number; heightCm: number; weightKg: number;
  };

  if (!goal || !VALID_GOALS.includes(goal)) {
    return NextResponse.json({ error: "هدف کالری نامعتبر است" }, { status: 400 });
  }
  if (!mealsPerDay || mealsPerDay < 2 || mealsPerDay > 6) {
    return NextResponse.json({ error: "تعداد وعده باید بین ۲ تا ۶ باشد" }, { status: 400 });
  }
  if (!sex || !VALID_SEX.includes(sex)) {
    return NextResponse.json({ error: "جنسیت نامعتبر است" }, { status: 400 });
  }
  if (!heightCm || typeof heightCm !== "number" || heightCm < 50 || heightCm > 260) {
    return NextResponse.json({ error: "قد وارد شده معتبر نیست" }, { status: 400 });
  }
  if (!weightKg || typeof weightKg !== "number" || weightKg < 20 || weightKg > 400) {
    return NextResponse.json({ error: "وزن وارد شده معتبر نیست" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { birthDate: true } });
  let age: number | null = null;
  if (user?.birthDate) {
    age = calcAge(user.birthDate);
  } else if (typeof ageYears === "number" && ageYears >= 10 && ageYears <= 100) {
    age = ageYears;
  }
  if (age === null) {
    return NextResponse.json({ error: "سن لازم است (تاریخ تولدت توی حسابت ثبت نشده)" }, { status: 400 });
  }

  const activePlan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true } });
  const activeGymDays = activePlan?.gymDays && Array.isArray(activePlan.gymDays) ? (activePlan.gymDays as string[]) : null;
  const gymDaysPerWeek = activeGymDays ? activeGymDays.length : 3; // فرض محافظه‌کارانه اگه برنامه ورزشی فعالی نبود

  const dailyTargetKcal = calcDailyTargetKcal({
    sex, weightKg, heightCm, age, gymDaysPerWeek, goal, trainingPhase: activePlan?.trainingPhase,
  });
  const mealBreakdown = splitMeals(dailyTargetKcal, mealsPerDay);

  // هدف قبلی (اگه بود) بسته می‌شه، هدف جدید از امروز شروع می‌شه
  await prisma.calorieTarget.updateMany({
    where: { userId, effectiveTo: null },
    data: { effectiveTo: new Date() },
  });
  const target = await prisma.calorieTarget.create({
    data: {
      userId, dailyTargetKcal, goal, mealsPerDay, sex, heightCm, weightKg,
      ageYears: user?.birthDate ? null : age,
      mealBreakdown: mealBreakdown as any,
    },
  });

  return NextResponse.json({ ok: true, target });
}

// PATCH /api/calorie/target { mealBreakdown: [{ key, label, kcal }] }
// کاربر خودش می‌تونه بچینه چند وعده داره و توی هر وعده چقدر کالری می‌خواد —
// جایگزین تقسیم خودکار splitMeals می‌شه؛ کالری روزانه هم برابر جمع همین
// وعده‌ها می‌شه تا نوار پیشرفت بالای صفحه با «سهم هر وعده» ناسازگار نباشه.
export async function PATCH(req: NextRequest) {
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { mealBreakdown } = body as { mealBreakdown: { key: string; label: string; kcal: number }[] };

  if (!Array.isArray(mealBreakdown) || mealBreakdown.length < 1 || mealBreakdown.length > 8) {
    return NextResponse.json({ error: "بین ۱ تا ۸ وعده مجاز است" }, { status: 400 });
  }
  const cleaned: { key: string; label: string; kcal: number }[] = [];
  for (const m of mealBreakdown) {
    if (!m || typeof m.label !== "string" || !m.label.trim()) {
      return NextResponse.json({ error: "اسم وعده نمی‌تواند خالی باشد" }, { status: 400 });
    }
    if (typeof m.kcal !== "number" || !isFinite(m.kcal) || m.kcal < 0 || m.kcal > 10000) {
      return NextResponse.json({ error: "مقدار کالری وعده نامعتبر است" }, { status: 400 });
    }
    const key = m.key || `meal_${cleaned.length}_${Date.now().toString(36)}`;
    cleaned.push({ key, label: clampText(m.label, 30), kcal: Math.round(m.kcal) });
  }
  const dailyTargetKcal = cleaned.reduce((s, m) => s + m.kcal, 0);
  if (dailyTargetKcal < 500) {
    return NextResponse.json({ error: "جمع کالری وعده‌ها خیلی کم است" }, { status: 400 });
  }

  const existing = await prisma.calorieTarget.findFirst({ where: { userId, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } });
  if (!existing) return NextResponse.json({ error: "اول باید هدف کالری‌ات را بسازی" }, { status: 400 });

  const target = await prisma.calorieTarget.update({
    where: { id: existing.id },
    data: { mealBreakdown: cleaned as any, dailyTargetKcal, mealsPerDay: cleaned.length },
  });

  return NextResponse.json({ ok: true, target });
}
