import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { generateRoadmapPlan } from "@/lib/aiClient";
import { countRowProgress } from "@/lib/roadmapPlan";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";

// تولید مسیر تا ۵۵ ثانیه طول می‌کشه (AI_TOTAL_BUDGET_MS) — بدون این،
// روی هاست‌هایی که فانکشن سرورلس رو خودکار قطع می‌کنن (مثل Vercel، سقف
// پیش‌فرض ۱۰-۱۵ ثانیه‌ست)، دقیقاً وسط تولید قطع می‌شه و کلاینت به‌جای
// جواب سرور یه قطعیِ خامِ اتصال می‌بینه («ارتباط برقرار نشد»).
export const maxDuration = 60;

const LIMIT = 6;
const WINDOW_MS = 30 * 60_000;

const MAX_TOPIC = 120;
const MAX_GOAL = 300;

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId: guard.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, topic: true, title: true, summary: true, goal: true,
      totalDuration: true, createdAt: true, steps: true, progress: true,
    },
  });

  // درصدِ پیشرفت همیشه سمتِ سرور حساب می‌شود، نه در کلاینت و نه توسط مدل.
  const list = roadmaps.map((r) => {
    const { total, done } = countRowProgress(r.steps, r.progress);
    return {
      id: r.id, topic: r.topic, title: r.title, summary: r.summary,
      goal: r.goal, totalDuration: r.totalDuration, createdAt: r.createdAt,
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

  // ساختِ هر مسیر یک فراخوانیِ گرانِ AI است (گاهی سه‌تا، با حلقه‌ی تعمیر) —
  // سقف روی خودِ کاربر است، نه روی IP.
  if (!(await checkRateLimit(`roadmap:${userId}`, LIMIT, WINDOW_MS))) {
    return NextResponse.json({ error: "تعداد ساختِ مسیر زیاد شد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const topic = clampText(String((body as any)?.topic || "").trim(), MAX_TOPIC);
  if (!topic) return NextResponse.json({ error: "بگو چی می‌خوای یاد بگیری" }, { status: 400 });
  const goalRaw = String((body as any)?.goal || "").trim();
  const goal = goalRaw ? clampText(goalRaw, MAX_GOAL) : undefined;

  let plan;
  try {
    const result = await generateRoadmapPlan({ topic, goal }, userId);
    plan = result.plan;
  } catch (err: any) {
    console.error("roadmap generation failed", err);
    return NextResponse.json(
      { error: err?.message || "ساختِ مسیر انجام نشد — دوباره امتحان کن" },
      { status: 502 }
    );
  }

  const created = await prisma.roadmap.create({
    data: {
      userId,
      topic,
      goal: goal ?? null,
      title: plan.title || topic,
      summary: plan.summary || null,
      guide: plan.guide,
      steps: plan.stages as any,
      totalDuration: plan.totalDuration || null,
      tools: plan.tools as any,
      generatedByAi: true,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
