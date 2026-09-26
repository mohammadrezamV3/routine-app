import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { createAiExercisePlan } from "@/lib/exercisePlanGeneration";

// AI ممکنه تا AI_TOTAL_BUDGET_MS طول بکشه — بدون این export، هاستِ
// سرورلس ممکنه زودتر از اون قطعش کنه.
export const maxDuration = 60;

export async function GET() {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  // ساخت برنامه واقعا AI صدا می‌زند — هزینه‌ی پول دارد و یک اتصال سرور را
  // چند ده ثانیه اشغال می‌کند. گیت ماژول فقط می‌گوید «مشترک است»، نه
  // «نمی‌تواند صد بار پشت‌سرهم بزند». سقف روزانه همان کاری را می‌کند که
  // برای refresh گزارش هفتگی هم کردیم.
  if (!guard.isSuperAdmin && !(await checkRateLimit(`exercise-plan-generate:${guard.userId}`, 10, 24 * 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد ساخت برنامه‌ی امروز تمام شده — فردا دوباره امتحان کن" }, { status: 429 });
  }

  const plan = await prisma.exercisePlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ plan });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;

  // اعتبارسنجی + سهمیه + AI + fallback در lib/exercisePlanGeneration.ts
  // (مشترک با /api/mobile/ai/exercise-plan)
  const body = await req.json().catch(() => null);
  const { status, json } = await createAiExercisePlan(guard.userId, guard.isSuperAdmin, body);
  return NextResponse.json(json, { status });
}
