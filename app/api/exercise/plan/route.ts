import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExercisePlan, ExerciseGoal, ExerciseLevel } from "@/lib/exercisePlans";

const VALID_LEVELS: ExerciseLevel[] = ["beginner", "intermediate", "advanced"];
const VALID_GOALS: ExerciseGoal[] = ["strength", "hypertrophy", "cut", "endurance"];

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
  const { level, heightCm, weightKg, goal, hasPhysicalLimitation } = body as {
    level: ExerciseLevel;
    heightCm?: number;
    weightKg?: number;
    goal: ExerciseGoal;
    hasPhysicalLimitation: boolean;
  };

  if (!level || !VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: "سطح نامعتبر است" }, { status: 400 });
  }
  if (!goal || !VALID_GOALS.includes(goal)) {
    return NextResponse.json({ error: "هدف تمرین نامعتبر است" }, { status: 400 });
  }
  if (heightCm !== undefined && (typeof heightCm !== "number" || heightCm < 50 || heightCm > 260)) {
    return NextResponse.json({ error: "قد وارد شده معتبر نیست" }, { status: 400 });
  }
  if (weightKg !== undefined && (typeof weightKg !== "number" || weightKg < 20 || weightKg > 400)) {
    return NextResponse.json({ error: "وزن وارد شده معتبر نیست" }, { status: 400 });
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
      planData: getExercisePlan(goal, level, !!hasPhysicalLimitation) as any,
    },
  });

  return NextResponse.json({ ok: true, plan });
}
