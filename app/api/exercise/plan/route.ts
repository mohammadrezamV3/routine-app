import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { getExercisePlan, GOAL_FALLBACK_MAP, GOAL_OPTION_LABELS, ExerciseGoalOption, ExerciseLevel } from "@/lib/exercisePlans";
import { generateExercisePlan } from "@/lib/aiClient";
import { FA_WEEKDAY } from "@/lib/jalali";

const VALID_LEVELS: ExerciseLevel[] = ["beginner", "intermediate", "advanced"];
const VALID_GOALS = Object.keys(GOAL_OPTION_LABELS) as ExerciseGoalOption[];
const MAX_DESCRIPTION_LEN = 500;

export async function GET() {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const plan = await prisma.exercisePlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ plan });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { level, heightCm, weightKg, goal, hasPhysicalLimitation, limitationDetails, gymDays, description, rulesAccepted } = body as {
    level: ExerciseLevel;
    heightCm?: number;
    weightKg?: number;
    goal: ExerciseGoalOption;
    hasPhysicalLimitation: boolean;
    limitationDetails?: string;
    gymDays: string[];
    description?: string;
    rulesAccepted: boolean;
  };

  if (!level || !VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: "سطح نامعتبر است" }, { status: 400 });
  }
  if (!goal || !VALID_GOALS.includes(goal)) {
    return NextResponse.json({ error: "هدف تمرین نامعتبر است" }, { status: 400 });
  }
  if (!Array.isArray(gymDays) || gymDays.length === 0 || !gymDays.every((d) => FA_WEEKDAY.includes(d))) {
    return NextResponse.json({ error: "روزهای باشگاه نامعتبر است" }, { status: 400 });
  }
  if (heightCm !== undefined && (typeof heightCm !== "number" || heightCm < 50 || heightCm > 260)) {
    return NextResponse.json({ error: "قد وارد شده معتبر نیست" }, { status: 400 });
  }
  if (weightKg !== undefined && (typeof weightKg !== "number" || weightKg < 20 || weightKg > 400)) {
    return NextResponse.json({ error: "وزن وارد شده معتبر نیست" }, { status: 400 });
  }
  if (description !== undefined && (typeof description !== "string" || description.length > MAX_DESCRIPTION_LEN)) {
    return NextResponse.json({ error: "توضیحات خیلی طولانی است" }, { status: 400 });
  }
  if (limitationDetails !== undefined && (typeof limitationDetails !== "string" || limitationDetails.length > MAX_DESCRIPTION_LEN)) {
    return NextResponse.json({ error: "توضیحِ محدودیت خیلی طولانی است" }, { status: 400 });
  }
  if (!rulesAccepted) {
    return NextResponse.json({ error: "قبول‌کردن قوانین الزامی است" }, { status: 400 });
  }

  const uniqueDays = [...new Set(gymDays)];
  const cleanDescription = description?.trim() || null;
  const cleanLimitationDetails = hasPhysicalLimitation ? limitationDetails?.trim() || null : null;
  let planData: unknown;
  let generatedByAi = false;
  try {
    const result = await generateExercisePlan({
      level, goalLabel: GOAL_OPTION_LABELS[goal], gymDays: uniqueDays,
      heightCm: heightCm || null, weightKg: weightKg || null,
      hasPhysicalLimitation: !!hasPhysicalLimitation, limitationDetails: cleanLimitationDetails, description: cleanDescription,
    });
    if (!result.feasible) {
      return NextResponse.json({ ok: false, feasible: false, message: result.message });
    }
    planData = result.days;
    generatedByAi = true;
  } catch (err) {
    // بدون کلید API یا خطای موقت سرویس — به قالب ایستای از‌پیش‌طراحی‌شده برمی‌گردیم،
    // نه اینکه کل onboarding رو خراب کنیم. ولی خطای واقعی رو لاگ می‌کنیم چون
    // قبلاً اینجا کاملاً بی‌صدا قورت داده می‌شد — روی سرورِ واقعی هیچ‌جوره
    // نمی‌شد فهمید مشکل env نتنظیم‌شده‌ست یا خطای شبکه یا چیزِ دیگه.
    console.error("[exercise/plan] AI generation failed, falling back to static template:", err);
    planData = getExercisePlan(GOAL_FALLBACK_MAP[goal], level, !!hasPhysicalLimitation, uniqueDays);
  }

  // پلن قبلی (اگه بود) غیرفعال می‌شه؛ همیشه فقط یک پلن فعال داریم
  await prisma.exercisePlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });

  const plan = await prisma.exercisePlan.create({
    data: {
      userId,
      level,
      heightCm: heightCm || null,
      weightKg: weightKg || null,
      goal,
      hasPhysicalLimitation: !!hasPhysicalLimitation,
      disclaimerAcceptedAt: new Date(),
      gymDays: uniqueDays as any,
      trainingPhase: "none",
      generatedByAi,
      planData: planData as any,
    },
  });

  return NextResponse.json({ ok: true, feasible: true, plan, generatedByAi });
}
