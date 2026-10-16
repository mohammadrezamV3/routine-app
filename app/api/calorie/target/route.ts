import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { calcAge, calcDailyTargetKcal, splitMeals, CalorieGoal, Sex } from "@/lib/calorieCalc";
import { clampText, readJsonBody } from "@/lib/validate";
import { checkNumber, checkOptionalNumber, clampDisplay, clampToLimit, hasNumberValue, limitError } from "@/lib/numberLimits";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// هدف قدیمی خارج از بازه موقع خروجی گیره می‌شه (دیتابیس دست نمی‌خوره)
function sanitizeTarget<T extends { dailyTargetKcal: number; mealBreakdown: unknown; proteinTargetG: number | null; carbsTargetG: number | null; fatTargetG: number | null }>(t: T): T {
  const meals = Array.isArray(t.mealBreakdown)
    ? (t.mealBreakdown as { kcal?: unknown }[]).map((m) => (m && typeof m === "object" ? { ...m, kcal: clampDisplay(m.kcal, "mealKcal") } : m))
    : t.mealBreakdown;
  return {
    ...t,
    dailyTargetKcal: clampDisplay(t.dailyTargetKcal, "dailyTargetKcal"),
    mealBreakdown: meals,
    proteinTargetG: t.proteinTargetG == null ? null : clampDisplay(t.proteinTargetG, "macroTargetG"),
    carbsTargetG: t.carbsTargetG == null ? null : clampDisplay(t.carbsTargetG, "macroTargetG"),
    fatTargetG: t.fatTargetG == null ? null : clampDisplay(t.fatTargetG, "macroTargetG"),
  };
}

const VALID_GOALS: CalorieGoal[] = ["lose", "maintain", "gain"];
const VALID_SEX: Sex[] = ["male", "female"];

export async function GET() {
  { const off = await sessionFeatureBlocked("calorie"); if (off) return off; }
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const [target, user] = await Promise.all([
    prisma.calorieTarget.findFirst({ where: { userId, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { birthDate: true } }),
  ]);
  // اگه تاریخ تولد توی حساب کاربری ثبت نشده، فرم باید مستقیم سن رو بپرسه
  return NextResponse.json({ target: target ? sanitizeTarget(target) : target, needsAge: !user?.birthDate });
}

// POST /api/calorie/target { goal, mealsPerDay, sex, ageYears?, heightCm, weightKg }
// هدف روزانه رو با فرمول Mifflin-St Jeor حساب می‌کنه (نه هوش مصنوعی — این یک
// محاسبه‌ی قطعی تغذیه‌ایه) و بین تعداد وعده‌های خواسته‌شده تقسیم می‌کنه.
async function handlePOST(req: NextRequest) {
  { const off = await sessionFeatureBlocked("calorie"); if (off) return off; }
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const parsedBody = await readJsonBody(req);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  const body = parsedBody.body;
  const { goal, sex } = body as { goal: CalorieGoal; sex: Sex };

  if (!goal || !VALID_GOALS.includes(goal)) {
    return NextResponse.json({ error: tr("هدف کالری نامعتبر است", "Invalid calorie goal") }, { status: 400 });
  }
  const meals = checkNumber(body.mealsPerDay, "mealsPerDay");
  if (!meals.ok) return NextResponse.json({ error: meals.error }, { status: 400 });
  const mealsPerDay = meals.value;
  if (!sex || !VALID_SEX.includes(sex)) {
    return NextResponse.json({ error: tr("جنسیت نامعتبر است", "Invalid gender") }, { status: 400 });
  }
  const h = checkNumber(body.heightCm, "heightCm");
  if (!h.ok) return NextResponse.json({ error: h.error }, { status: 400 });
  const w = checkNumber(body.weightKg, "weightKg");
  if (!w.ok) return NextResponse.json({ error: w.error }, { status: 400 });
  const heightCm = h.value;
  const weightKg = w.value;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { birthDate: true } });
  let age: number | null = null;
  if (user?.birthDate) {
    age = calcAge(user.birthDate);
  } else if (hasNumberValue(body.ageYears)) {
    const a = checkNumber(body.ageYears, "ageYears");
    if (!a.ok) return NextResponse.json({ error: a.error }, { status: 400 });
    age = a.value;
  }
  if (age === null) {
    return NextResponse.json({ error: tr("سن لازم است (تاریخ تولدت توی حسابت ثبت نشده)", "Age is required (your birth date is not saved on your account)") }, { status: 400 });
  }
  // تاریخ تولد ثبت‌شده‌ی خراب (مثلا سال 1800) فرمول رو منفجر نکنه
  age = clampToLimit(age, "ageYears");

  const activePlan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true } });
  const activeGymDays = activePlan?.gymDays && Array.isArray(activePlan.gymDays) ? (activePlan.gymDays as string[]) : null;
  // اگه برنامه‌ی ورزشی فعالی نبود، «۳ روز باشگاه» فرض نکن — این ضریب ۱.۵۵
  // (فعالیت متوسط) رو می‌داد و هدف رو برای کسی که اصلا تمرین نمی‌کنه چند صد
  // کالری بیش‌برآورد می‌کرد. فرض واقعا محافظه‌کارانه «کم‌تحرک سبک» (۱.۳۷۵)ه.
  const gymDaysPerWeek = activeGymDays ? activeGymDays.length : 1;

  const dailyTargetKcal = clampToLimit(calcDailyTargetKcal({
    sex, weightKg, heightCm, age, gymDaysPerWeek, goal, trainingPhase: activePlan?.trainingPhase,
  }), "dailyTargetKcal");
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

  return NextResponse.json({ ok: true, target: sanitizeTarget(target) });
}

// PATCH /api/calorie/target { mealBreakdown: [{ key, label, kcal }] }
// کاربر خودش می‌تونه بچینه چند وعده داره و توی هر وعده چقدر کالری می‌خواد —
// جایگزین تقسیم خودکار splitMeals می‌شه؛ کالری روزانه هم برابر جمع همین
// وعده‌ها می‌شه تا نوار پیشرفت بالای صفحه با «سهم هر وعده» ناسازگار نباشه.
async function handlePATCH(req: NextRequest) {
  { const off = await sessionFeatureBlocked("calorie"); if (off) return off; }
  const guard = await requireModule(ModuleKey.CALORIE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const parsedBody = await readJsonBody(req);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  const { mealBreakdown } = parsedBody.body as { mealBreakdown: { key: string; label: string; kcal: number }[] };

  // هدف درشت‌مغذی اختیاریه؛ هر کدوم که خالی بمونه null ذخیره می‌شه.
  const protein = checkOptionalNumber(parsedBody.body.proteinTargetG, "macroTargetG", { coerceString: true });
  const carbs = checkOptionalNumber(parsedBody.body.carbsTargetG, "macroTargetG", { coerceString: true });
  const fat = checkOptionalNumber(parsedBody.body.fatTargetG, "macroTargetG", { coerceString: true });
  for (const c of [protein, carbs, fat]) {
    if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
  }

  if (!Array.isArray(mealBreakdown) || mealBreakdown.length < 1 || mealBreakdown.length > 8) {
    return NextResponse.json({ error: limitError("mealCount") }, { status: 400 });
  }
  const cleaned: { key: string; label: string; kcal: number }[] = [];
  for (const m of mealBreakdown) {
    if (!m || typeof m.label !== "string" || !m.label.trim()) {
      return NextResponse.json({ error: tr("اسم وعده نمی‌تواند خالی باشد", "Meal name cannot be empty") }, { status: 400 });
    }
    const k = checkNumber(typeof m.kcal === "number" && Number.isFinite(m.kcal) ? Math.round(m.kcal) : m.kcal, "mealKcal");
    if (!k.ok) return NextResponse.json({ error: k.error }, { status: 400 });
    const key = typeof m.key === "string" && m.key ? clampText(m.key, 40) : `meal_${cleaned.length}_${Date.now().toString(36)}`;
    cleaned.push({ key, label: clampText(m.label, 30), kcal: k.value });
  }
  const dailyTargetKcal = cleaned.reduce((s, m) => s + m.kcal, 0);
  // جمع وعده‌ها همون هدف روزانه‌ست و باید توی بازه‌ی هدف روزانه بمونه
  const daily = checkNumber(dailyTargetKcal, "dailyTargetKcal");
  if (!daily.ok) return NextResponse.json({ error: daily.error }, { status: 400 });

  const existing = await prisma.calorieTarget.findFirst({ where: { userId, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } });
  if (!existing) return NextResponse.json({ error: tr("اول باید هدف کالری‌ات را بسازی", "Create your calorie goal first") }, { status: 400 });

  const target = await prisma.calorieTarget.update({
    where: { id: existing.id },
    data: {
      mealBreakdown: cleaned as any, dailyTargetKcal, mealsPerDay: cleaned.length,
      proteinTargetG: protein.ok ? protein.value : null, carbsTargetG: carbs.ok ? carbs.value : null, fatTargetG: fat.ok ? fat.value : null,
    },
  });

  return NextResponse.json({ ok: true, target: sanitizeTarget(target) });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["calorie"], handlePOST);
export const PATCH = withLiveSync(["calorie"], handlePATCH);
