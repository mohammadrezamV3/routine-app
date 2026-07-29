import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggestExerciseSubstitute } from "@/lib/anthropic";
import { getFallbackSubstitute, ExerciseDay } from "@/lib/exercisePlans";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";

// PATCH /api/exercise/plan/substitute { planId, day, oldItem }
// جایگزینیِ یک حرکت — چون تجهیزاتش توی باشگاه کاربر نیست. این «برنامه‌ی جدید»
// حساب نمی‌شه (سقف دوهفته‌ای رو دست نمی‌زنه)، فقط یک ابزار سبک با rate-limit جدا.
export async function PATCH(req: NextRequest) {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { planId, day, oldItem } = body as { planId: string; day: string; oldItem: string };
  if (!planId || !day || !oldItem) {
    return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
  }

  if (!checkRateLimit(`exercise-sub:${userId}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "سقف درخواست جایگزینی در این ساعت پر شده — بعداً امتحان کن" }, { status: 429 });
  }

  const plan = await prisma.exercisePlan.findFirst({ where: { id: planId, userId } });
  if (!plan) return NextResponse.json({ error: "برنامه پیدا نشد" }, { status: 404 });

  const days = plan.planData as unknown as ExerciseDay[];
  const dayEntry = Array.isArray(days) ? days.find((d) => d.day === day) : null;
  if (!dayEntry || !dayEntry.items.includes(oldItem)) {
    return NextResponse.json({ error: "این حرکت توی برنامه پیدا نشد" }, { status: 404 });
  }

  let substitute: string | null = null;
  try {
    substitute = await suggestExerciseSubstitute(oldItem);
  } catch {
    substitute = getFallbackSubstitute(oldItem);
  }
  if (!substitute) {
    return NextResponse.json({ error: "معادل مشخصی برای این حرکت پیدا نکردیم — با مربی باشگاه هماهنگ کن" }, { status: 422 });
  }

  const nextDays = days.map((d) =>
    d.day === day ? { ...d, items: d.items.map((it) => (it === oldItem ? substitute! : it)) } : d
  );

  const updated = await prisma.exercisePlan.update({
    where: { id: planId },
    data: { planData: nextDays as any },
  });

  return NextResponse.json({ ok: true, plan: updated, substitute });
}
