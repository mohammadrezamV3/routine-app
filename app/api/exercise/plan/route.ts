import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExercisePlan, ExerciseGoal, ExerciseLevel } from "@/lib/exercisePlans";
import { generateExercisePlan } from "@/lib/anthropic";
import { checkNewProgramEligibility } from "@/lib/exerciseEligibility";
import { FA_WEEKDAY } from "@/lib/jalali";

const VALID_LEVELS: ExerciseLevel[] = ["beginner", "intermediate", "advanced"];
const VALID_GOALS: ExerciseGoal[] = ["strength", "hypertrophy", "cut", "endurance"];
const VALID_PHASES = ["bulk", "cut", "maintenance", "none"] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const plan = await prisma.exercisePlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ plan });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { level, heightCm, weightKg, goal, hasPhysicalLimitation, gymDays, trainingPhase, rulesAccepted } = body as {
    level: ExerciseLevel;
    heightCm?: number;
    weightKg?: number;
    goal: ExerciseGoal;
    hasPhysicalLimitation: boolean;
    gymDays: string[];
    trainingPhase: (typeof VALID_PHASES)[number];
    rulesAccepted: boolean;
  };

  if (!level || !VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: "سطح نامعتبر است" }, { status: 400 });
  }
  if (!goal || !VALID_GOALS.includes(goal)) {
    return NextResponse.json({ error: "هدف تمرین نامعتبر است" }, { status: 400 });
  }
  if (!trainingPhase || !VALID_PHASES.includes(trainingPhase)) {
    return NextResponse.json({ error: "دوره تمرینی نامعتبر است" }, { status: 400 });
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
  if (!rulesAccepted) {
    return NextResponse.json({ error: "قبول‌کردن قوانین الزامی است" }, { status: 400 });
  }

  const currentActive = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { startDate: "desc" } });
  const eligibility = await checkNewProgramEligibility(userId, currentActive);
  if (!eligibility.eligible) {
    return NextResponse.json({ error: "هنوز واجد شرایط برنامه جدید نیستی", eligibility }, { status: 403 });
  }

  const uniqueDays = [...new Set(gymDays)];
  let planData: unknown;
  let generatedByAi = false;
  try {
    planData = await generateExercisePlan({
      level, goal, gymDays: uniqueDays, heightCm: heightCm || null, weightKg: weightKg || null,
      trainingPhase, hasPhysicalLimitation: !!hasPhysicalLimitation,
    });
    generatedByAi = true;
  } catch {
    // بدون کلید API یا خطای موقت سرویس — به قالب ایستای از‌پیش‌طراحی‌شده برمی‌گردیم،
    // نه اینکه کل onboarding رو خراب کنیم
    planData = getExercisePlan(goal, level, !!hasPhysicalLimitation);
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
      trainingPhase,
      generatedByAi,
      planData: planData as any,
    },
  });

  return NextResponse.json({ ok: true, plan, generatedByAi });
}
