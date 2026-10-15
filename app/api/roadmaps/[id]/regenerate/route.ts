import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/featureFlagsServer";
import { requireModule } from "@/lib/moduleAccess";
import { AiFeatureKey, ModuleKey } from "@prisma/client";
import { checkAndConsumeAiQuota } from "@/lib/aiQuota";
import { buildStatusOf } from "@/lib/roadmapBuilder";
import { generateRoadmapGuide, generateStageDetail, STAGE_REGEN_TIMEOUT_MS } from "@/lib/aiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizePlan, sanitizeStepProgress } from "@/lib/roadmapPlan";
import { withLiveSync } from "@/lib/realtime";

// یک فراخوانی AI تا ۴۵ ثانیه (AI_TIMEOUT_MS) — همان دلیل روت ساخت.
// یک مرحله با جزئیات کامل (تا ۹۰۰۰ توکن) بیشتر از ۶۰ ثانیه طول می‌کشد؛
// nginx همین مسیر را ۱۳۰ ثانیه صبر می‌کند (deploy/nginx.*.conf).
export const maxDuration = 120;

const LIMIT = 20;
const WINDOW_MS = 30 * 60_000;

/**
 * ساختن دوباره‌ی یک تکه از مسیر: `{target:"stage", n}` جزئیات یک مرحله،
 * `{target:"guide"}` متن راهنما.
 *
 * برای تکه‌هایی‌ست که در بودجه‌ی زمانی ساخت اول نرسیدند (detailed:false یا
 * راهنمای خالی)، یا کاربر از جزئیات یک مرحله راضی نیست. اسکلت (عنوان،
 * هدف، محدوده‌ی مرحله‌ها) هیچ‌وقت عوض نمی‌شود — وگرنه بقیه‌ی مرحله‌ها با
 * آن ناهم‌خوان می‌شدند.
 */
async function handlePOST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireFeature("roadmaps");
  if (!guard.ok) return guard.response;
  // رودمپ ماژول پولیه — وقتی فلگ برای همه روشن شد، دسترسی ماژول هم لازمه
  { const mod = await requireModule(ModuleKey.ROADMAP); if (!mod.ok) return mod.response; }
  const userId = guard.userId;

  if (!(await checkRateLimit(`roadmap-part:${userId}`, LIMIT, WINDOW_MS))) {
    return NextResponse.json({ error: tr("تعداد درخواست زیاد شد — کمی بعد دوباره امتحان کن", "Too many requests — try again shortly") }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const target = (body as any)?.target;
  const n = (body as any)?.n;
  if (target !== "guide" && target !== "stage") {
    return NextResponse.json({ error: tr("ورودی نامعتبر است", "Invalid input") }, { status: 400 });
  }
  if (target === "stage" && (typeof n !== "number" || !Number.isInteger(n))) {
    return NextResponse.json({ error: tr("ورودی نامعتبر است", "Invalid input") }, { status: 400 });
  }

  const row = await prisma.roadmap.findFirst({
    where: { id: params.id, userId },
    select: {
      topic: true, goal: true, title: true, summary: true, guide: true,
      steps: true, tools: true, meta: true, totalDuration: true, progress: true,
    },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  // تا وقتی ساخت پس‌زمینه همین ردیف را می‌نویسد، ساخت دستی یعنی دو نویسنده
  // روی یک steps — یکی کار دیگری را پاک می‌کند.
  if (buildStatusOf(row.meta)?.status === "building") {
    return NextResponse.json({ error: tr("این مسیر هنوز در حال ساخته‌شدن است — چند لحظه صبر کن", "This roadmap is still being built — wait a moment") }, { status: 409 });
  }

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

  // سهمیه‌ی AI (سقف کل دوره‌ی آزمایشی برای حساب تازه — lib/trial.ts)
  const quota = await checkAndConsumeAiQuota(userId, guard.isSuperAdmin, AiFeatureKey.ROADMAP_GENERATION);
  if (!quota.ok) return NextResponse.json({ error: quota.error, code: quota.code }, { status: 429 });

  try {
    if (target === "guide") {
      const guide = await generateRoadmapGuide(ctx, userId, STAGE_REGEN_TIMEOUT_MS);
      await prisma.roadmap.updateMany({ where: { id: params.id, userId }, data: { guide } });
      return NextResponse.json({ guide });
    }

    const stage = await generateStageDetail(ctx, n, userId, STAGE_REGEN_TIMEOUT_MS);
    const stages = plan.stages.map((s) => (s.n === n ? stage : s));
    // کارهای مرحله عوض شده‌اند؛ تیک کارهایی که دیگر نیستند دور ریخته می‌شود.
    const progress = sanitizeStepProgress(stages, row.progress);
    await prisma.roadmap.updateMany({
      where: { id: params.id, userId },
      data: { steps: stages as any, progress: progress as any },
    });
    return NextResponse.json({ stage, stepProgress: progress });
  } catch (err: any) {
    console.error("roadmap regenerate failed", err);
    await quota.release();
    return NextResponse.json({ error: err?.message || tr("ساخته نشد — دوباره امتحان کن", "It could not be created — try again") }, { status: 502 });
  }
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["roadmaps"], handlePOST);
