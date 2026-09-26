import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { countRowProgress } from "@/lib/roadmapPlan";
import { createAiRoadmap } from "@/lib/roadmapGeneration";

// تولید مسیر (اسکلت + راهنما و جزئیاتِ موازیِ هر مرحله) تا ۵۵ ثانیه طول می‌کشه (AI_TOTAL_BUDGET_MS) — بدون این،
// روی هاست‌هایی که فانکشن سرورلس رو خودکار قطع می‌کنن (مثل Vercel، سقف
// پیش‌فرض ۱۰-۱۵ ثانیه‌ست)، دقیقاً وسط تولید قطع می‌شه و کلاینت به‌جای
// جواب سرور یه قطعیِ خامِ اتصال می‌بینه («ارتباط برقرار نشد»).
export const maxDuration = 60;

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId: guard.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, topic: true, title: true, summary: true, goal: true,
      totalDuration: true, createdAt: true, steps: true, progress: true, meta: true,
    },
  });

  // درصدِ پیشرفت همیشه سمتِ سرور حساب می‌شود، نه در کلاینت و نه توسط مدل.
  const list = roadmaps.map((r) => {
    const { total, done } = countRowProgress(r.steps, r.progress);
    return {
      id: r.id, topic: r.topic, title: r.title, summary: r.summary,
      goal: r.goal, totalDuration: r.totalDuration, createdAt: r.createdAt,
      level: (r.meta as any)?.level ?? null,
      stageCount: total, doneCount: done,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  });

  return NextResponse.json({ roadmaps: list });
}

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  // سقفِ نرخ + اعتبارسنجی + AI + ذخیره در lib/roadmapGeneration.ts (مشترک با /api/mobile/ai/roadmap)
  const body = await req.json().catch(() => null);
  const r = await createAiRoadmap(userId, body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(
    { id: r.id, pendingStages: r.pendingStages, guideReady: r.guideReady },
    { status: 201 }
  );
}
