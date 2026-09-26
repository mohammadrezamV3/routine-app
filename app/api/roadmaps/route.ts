import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/featureFlagsServer";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { generateRoadmapPlan } from "@/lib/aiClient";
import { countRowProgress, parseHours, parseLevel } from "@/lib/roadmapPlan";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";

// تولید مسیر (اسکلت + راهنما و جزئیاتِ موازیِ هر مرحله) تا ۵۵ ثانیه طول می‌کشه (AI_TOTAL_BUDGET_MS) — بدون این،
// روی هاست‌هایی که فانکشن سرورلس رو خودکار قطع می‌کنن (مثل Vercel، سقف
// پیش‌فرض ۱۰-۱۵ ثانیه‌ست)، دقیقاً وسط تولید قطع می‌شه و کلاینت به‌جای
// جواب سرور یه قطعیِ خامِ اتصال می‌بینه («ارتباط برقرار نشد»).
export const maxDuration = 60;

const LIMIT = 6;
const WINDOW_MS = 30 * 60_000;

const MAX_TOPIC = 120;
const MAX_GOAL = 300;
const MAX_BACKGROUND = 300;

export async function GET() {
  const guard = await requireFeature("roadmaps");
  if (!guard.ok) return guard.response;
  // رودمپ ماژولِ پولیه — وقتی فلگ برای همه روشن شد، دسترسیِ ماژول هم لازمه
  { const mod = await requireModule(ModuleKey.ROADMAP); if (!mod.ok) return mod.response; }

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
  const guard = await requireFeature("roadmaps");
  if (!guard.ok) return guard.response;
  // رودمپ ماژولِ پولیه — وقتی فلگ برای همه روشن شد، دسترسیِ ماژول هم لازمه
  { const mod = await requireModule(ModuleKey.ROADMAP); if (!mod.ok) return mod.response; }
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
  // سطح و وقتِ هفتگی فقط از فهرستِ ثابت پذیرفته می‌شوند — هر مقدارِ دیگری
  // یعنی «نگفته»، نه متنی که مستقیم به پرامپت برود.
  const level = parseLevel((body as any)?.level);
  const weeklyHours = parseHours((body as any)?.weeklyHours);
  const bgRaw = String((body as any)?.background || "").trim();
  const background = bgRaw ? clampText(bgRaw, MAX_BACKGROUND) : undefined;

  let plan;
  let meta;
  try {
    const result = await generateRoadmapPlan({ topic, goal, level, weeklyHours, background }, userId);
    plan = result.plan;
    meta = result.meta;
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
      meta: plan.meta as any,
      generatedByAi: true,
    },
    select: { id: true },
  });

  return NextResponse.json(
    { id: created.id, pendingStages: meta.pendingStages, guideReady: meta.guideReady },
    { status: 201 }
  );
}
