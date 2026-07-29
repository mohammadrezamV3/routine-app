import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcAge, calcDailyTargetKcal, splitMeals, CalorieGoal, Sex } from "@/lib/calorieCalc";

const VALID_GOALS: CalorieGoal[] = ["lose", "maintain", "gain"];
const VALID_SEX: Sex[] = ["male", "female"];

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
