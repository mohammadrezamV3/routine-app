import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/featureFlagsServer";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { generateRoadmapGuide, generateStageDetail, STAGE_REGEN_TIMEOUT_MS } from "@/lib/aiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizePlan, sanitizeStepProgress } from "@/lib/roadmapPlan";

// یک فراخوانیِ AI تا ۴۵ ثانیه (AI_TIMEOUT_MS) — همان دلیلِ روتِ ساخت.
// یک مرحله با جزئیاتِ کامل (تا ۹۰۰۰ توکن) بیشتر از ۶۰ ثانیه طول می‌کشد؛
// nginx همین مسیر را ۱۳۰ ثانیه صبر می‌کند (deploy/nginx.*.conf).
export const maxDuration = 120;

const LIMIT = 20;
const WINDOW_MS = 30 * 60_000;

/**
 * ساختنِ دوباره‌ی یک تکه از مسیر: `{target:"stage", n}` جزئیاتِ یک مرحله،
 * `{target:"guide"}` متنِ راهنما.
 *
 * برای تکه‌هایی‌ست که در بودجه‌ی زمانیِ ساختِ اول نرسیدند (detailed:false یا
 * راهنمای خالی)، یا کاربر از جزئیاتِ یک مرحله راضی نیست. اسکلت (عنوان،
 * هدف، محدوده‌ی مرحله‌ها) هیچ‌وقت عوض نمی‌شود — وگرنه بقیه‌ی مرحله‌ها با
 * آن ناهم‌خوان می‌شدند.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireFeature("roadmaps");
  if (!guard.ok) return guard.response;
  // رودمپ ماژولِ پولیه — وقتی فلگ برای همه روشن شد، دسترسیِ ماژول هم لازمه
  { const mod = await requireModule(ModuleKey.ROADMAP); if (!mod.ok) return mod.response; }
  const userId = guard.userId;

  if (!(await checkRateLimit(`roadmap-part:${userId}`, LIMIT, WINDOW_MS))) {
    return NextResponse.json({ error: "تعداد درخواست زیاد شد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const target = (body as any)?.target;
  const n = (body as any)?.n;
  if (target !== "guide" && target !== "stage") {
    return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  }
  if (target === "stage" && (typeof n !== "number" || !Number.isInteger(n))) {
    return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  }

  const row = await prisma.roadmap.findFirst({
    where: { id: params.id, userId },
    select: {
      topic: true, goal: true, title: true, summary: true, guide: true,
      steps: true, tools: true, meta: true, totalDuration: true, progress: true,
    },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const plan = normalizePlan({
    title: row.title, summary: row.summary, guide: row.guide, totalDuration: row.totalDuration,
    tools: row.tools, meta: row.meta, stages: row.steps,
  });
  const ctx = {
    profile: {
      topic: row.topic,
      goal: row.goal ?? undefined,
      level: plan.meta.level,
      weeklyHours: plan.meta.weeklyHours,
      background: plan.meta.background,
    },
    plan,
  };

  try {
    if (target === "guide") {
      const guide = await generateRoadmapGuide(ctx, userId, STAGE_REGEN_TIMEOUT_MS);
      await prisma.roadmap.updateMany({ where: { id: params.id, userId }, data: { guide } });
      return NextResponse.json({ guide });
    }

    const stage = await generateStageDetail(ctx, n, userId, STAGE_REGEN_TIMEOUT_MS);
    const stages = plan.stages.map((s) => (s.n === n ? stage : s));
    // کارهای مرحله عوض شده‌اند؛ تیکِ کارهایی که دیگر نیستند دور ریخته می‌شود.
    const progress = sanitizeStepProgress(stages, row.progress);
    await prisma.roadmap.updateMany({
      where: { id: params.id, userId },
      data: { steps: stages as any, progress: progress as any },
    });
    return NextResponse.json({ stage, stepProgress: progress });
  } catch (err: any) {
    console.error("roadmap regenerate failed", err);
    return NextResponse.json({ error: err?.message || "ساخته نشد — دوباره امتحان کن" }, { status: 502 });
  }
}
