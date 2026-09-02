import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { FA_WEEKDAY } from "@/lib/jalali";
import { ExerciseDay } from "@/lib/exercisePlans";

// POST /api/exercise/plan/manual — برنامه‌ای که خود کاربر دستی وارد کرده
// (بدون هوش مصنوعی/قالب آماده)، جایگزین /api/exercise/plan (که فقط
// AI-یا-fallback می‌سازه) برای وقتی کاربر برنامه‌ی شخصی خودشو داره.
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.EXERCISE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { planData, rulesAccepted } = body as { planData: ExerciseDay[]; rulesAccepted: boolean };

  if (!rulesAccepted) {
    return NextResponse.json({ error: "قبول‌کردن قوانین الزامی است" }, { status: 400 });
  }
  if (!Array.isArray(planData) || planData.length === 0) {
    return NextResponse.json({ error: "حداقل یک روز تمرینی لازم است" }, { status: 400 });
  }

  const cleanDays: ExerciseDay[] = [];
  const seenDays = new Set<string>();
  for (const d of planData) {
    if (!d || typeof d.day !== "string" || !FA_WEEKDAY.includes(d.day)) {
      return NextResponse.json({ error: "روز نامعتبر در برنامه" }, { status: 400 });
    }
    if (seenDays.has(d.day)) {
      return NextResponse.json({ error: `روز «${d.day}» بیش از یک بار انتخاب شده` }, { status: 400 });
    }
    seenDays.add(d.day);

    const items = Array.isArray(d.items) ? d.items.map((i) => String(i).trim()).filter(Boolean) : [];
    if (items.length === 0) {
      return NextResponse.json({ error: `برای روز «${d.day}» حداقل یک حرکت لازم است` }, { status: 400 });
    }
    cleanDays.push({ day: d.day, focus: String(d.focus || "").trim() || "برنامه‌ی شخصی", items });
  }

  const gymDays = cleanDays.map((d) => d.day);

  await prisma.exercisePlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });

  const plan = await prisma.exercisePlan.create({
    data: {
      userId,
      level: "custom",
      goal: null,
      hasPhysicalLimitation: false,
      disclaimerAcceptedAt: new Date(),
      gymDays: gymDays as any,
      trainingPhase: "none",
      generatedByAi: false,
      planData: cleanDays as any,
    },
  });

  return NextResponse.json({ ok: true, plan });
}
