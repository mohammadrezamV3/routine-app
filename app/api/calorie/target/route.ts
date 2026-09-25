import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { computeCalorieTarget, validateCalorieTargetInput, validateMealsPatch } from "@/lib/calorieTargetService";

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

  const body = await req.json().catch(() => null);
  // اعتبارسنجی + محاسبه‌ی Mifflin-St Jeor مشترک با همگام‌سازیِ موبایل (lib/calorieTargetService.ts)
  const input = validateCalorieTargetInput(body);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const computed = await computeCalorieTarget(userId, input.value);
  if (!computed.ok) return NextResponse.json({ error: computed.error }, { status: 400 });
  const { mealBreakdown, ...fields } = computed.value;

  // هدف قبلی (اگه بود) بسته می‌شه، هدف جدید از امروز شروع می‌شه
  await prisma.calorieTarget.updateMany({
    where: { userId, effectiveTo: null },
    data: { effectiveTo: new Date() },
  });
  const target = await prisma.calorieTarget.create({
    data: { userId, ...fields, mealBreakdown: mealBreakdown as any },
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

  const body = await req.json().catch(() => null);
  const patch = validateMealsPatch(body);
  if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: 400 });

  const existing = await prisma.calorieTarget.findFirst({ where: { userId, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } });
  if (!existing) return NextResponse.json({ error: "اول باید هدف کالری‌ات را بسازی" }, { status: 400 });

  const target = await prisma.calorieTarget.update({
    where: { id: existing.id },
    data: { ...patch.value, mealBreakdown: patch.value.mealBreakdown as any },
  });

  return NextResponse.json({ ok: true, target });
}
