import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXERCISE_TEMPLATES } from "@/lib/exercisePlans";
import { clampText } from "@/lib/validate";

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
  const { level, heightCm, weightKg, goal, hasPhysicalLimitation, disclaimerAccepted } = body as {
    level: "beginner" | "intermediate" | "advanced";
    heightCm?: number;
    weightKg?: number;
    goal?: string;
    hasPhysicalLimitation: boolean;
    disclaimerAccepted: boolean;
  };

  if (!disclaimerAccepted) {
    return NextResponse.json({ error: "برای فعال‌سازی ماژول ورزش باید سلب مسئولیت رو تایید کنی" }, { status: 400 });
  }
  if (!level || !EXERCISE_TEMPLATES[level]) {
    return NextResponse.json({ error: "سطح نامعتبر است" }, { status: 400 });
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
      goal: goal ? clampText(goal, 200) : null,
      hasPhysicalLimitation: !!hasPhysicalLimitation,
      disclaimerAcceptedAt: new Date(),
      planData: EXERCISE_TEMPLATES[level] as any,
    },
  });

  return NextResponse.json({ ok: true, plan });
}
