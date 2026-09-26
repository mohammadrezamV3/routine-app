import { prisma } from "@/lib/prisma";
import { generateRoadmapGuide, generateRoadmapPlan, generateStageDetail } from "@/lib/aiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizePlan, parseHours, parseLevel, sanitizeStepProgress, type PlanStage, type StepProgress } from "@/lib/roadmapPlan";
import { clampText } from "@/lib/validate";

// هسته‌ی ساختِ رودمپ با AI — مشترک بینِ POST /api/roadmaps (وب) و
// POST /api/mobile/ai/roadmap (اپ). گیت (سوپریوزر/ماژول) کارِ route است؛
// این‌جا سقفِ نرخ (همون سطلِ `roadmap:<userId>` برای هر دو مسیر)، اعتبارسنجی،
// فراخوانیِ AI (ثبتِ مصرف داخلِ generateRoadmapPlan) و ذخیره.
//
// ساخت دوفازی است (اسکلت + راهنما و جزئیاتِ موازیِ هر مرحله، lib/aiClient.ts)؛
// مرحله‌ای که در بودجه‌ی زمانی نرسید `detailed:false` می‌ماند و در
// pendingStages برمی‌گردد تا کلاینت (وب یا اپ) با regenerate بسازدش.

const LIMIT = 6;
const WINDOW_MS = 30 * 60_000;
const MAX_TOPIC = 120;
const MAX_GOAL = 300;
const MAX_BACKGROUND = 300;

export type CreateAiRoadmapResult =
  | { ok: true; id: string; pendingStages: number[]; guideReady: boolean }
  | { ok: false; status: number; error: string };

export async function createAiRoadmap(
  userId: string,
  body: unknown
): Promise<CreateAiRoadmapResult> {
  // ساختِ هر مسیر یک فراخوانیِ گرانِ AI است (گاهی سه‌تا، با حلقه‌ی تعمیر) —
  // سقف روی خودِ کاربر است، نه روی IP.
  if (!(await checkRateLimit(`roadmap:${userId}`, LIMIT, WINDOW_MS))) {
    return { ok: false, status: 429, error: "تعداد ساختِ مسیر زیاد شد — کمی بعد دوباره امتحان کن" };
  }

  const topic = clampText(String((body as any)?.topic || "").trim(), MAX_TOPIC);
  if (!topic) return { ok: false, status: 400, error: "بگو چی می‌خوای یاد بگیری" };
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
    return { ok: false, status: 502, error: err?.message || "ساختِ مسیر انجام نشد — دوباره امتحان کن" };
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
  return { ok: true, id: created.id, pendingStages: meta.pendingStages, guideReady: meta.guideReady };
}

// ── ساختنِ دوباره‌ی یک تکه ────────────────────────────────────────────────
// مشترک بینِ POST /api/roadmaps/[id]/regenerate (وب) و
// POST /api/mobile/ai/roadmap/[id]/regenerate (اپ). گیت کارِ route است.

const PART_LIMIT = 20;
const PART_WINDOW_MS = 30 * 60_000;

export type RegenerateRoadmapResult =
  | { ok: true; target: "guide"; guide: string }
  | { ok: true; target: "stage"; stage: PlanStage; stepProgress: StepProgress }
  | { ok: false; status: number; error: string };

/**
 * ساختنِ دوباره‌ی یک تکه از مسیر: `{target:"stage", n}` جزئیاتِ یک مرحله،
 * `{target:"guide"}` متنِ راهنما.
 *
 * برای تکه‌هایی‌ست که در بودجه‌ی زمانیِ ساختِ اول نرسیدند (detailed:false یا
 * راهنمای خالی)، یا کاربر از جزئیاتِ یک مرحله راضی نیست. اسکلت (عنوان،
 * هدف، محدوده‌ی مرحله‌ها) هیچ‌وقت عوض نمی‌شود — وگرنه بقیه‌ی مرحله‌ها با
 * آن ناهم‌خوان می‌شدند.
 */
export async function regenerateRoadmapPart(
  userId: string,
  roadmapId: string,
  body: unknown
): Promise<RegenerateRoadmapResult> {
  if (!(await checkRateLimit(`roadmap-part:${userId}`, PART_LIMIT, PART_WINDOW_MS))) {
    return { ok: false, status: 429, error: "تعداد درخواست زیاد شد — کمی بعد دوباره امتحان کن" };
  }

  const target = (body as any)?.target;
  const n = (body as any)?.n;
  if (target !== "guide" && target !== "stage") {
    return { ok: false, status: 400, error: "ورودی نامعتبر است" };
  }
  if (target === "stage" && (typeof n !== "number" || !Number.isInteger(n))) {
    return { ok: false, status: 400, error: "ورودی نامعتبر است" };
  }

  const row = await prisma.roadmap.findFirst({
    where: { id: roadmapId, userId },
    select: {
      topic: true, goal: true, title: true, summary: true, guide: true,
      steps: true, tools: true, meta: true, totalDuration: true, progress: true,
    },
  });
  if (!row) return { ok: false, status: 404, error: "not found" };

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
      const guide = await generateRoadmapGuide(ctx, userId);
      await prisma.roadmap.updateMany({ where: { id: roadmapId, userId }, data: { guide } });
      return { ok: true, target: "guide", guide };
    }

    const stage = await generateStageDetail(ctx, n, userId);
    const stages = plan.stages.map((s) => (s.n === n ? stage : s));
    // کارهای مرحله عوض شده‌اند؛ تیکِ کارهایی که دیگر نیستند دور ریخته می‌شود.
    const progress = sanitizeStepProgress(stages, row.progress);
    await prisma.roadmap.updateMany({
      where: { id: roadmapId, userId },
      data: { steps: stages as any, progress: progress as any },
    });
    return { ok: true, target: "stage", stage, stepProgress: progress };
  } catch (err: any) {
    console.error("roadmap regenerate failed", err);
    return { ok: false, status: 502, error: err?.message || "ساخته نشد — دوباره امتحان کن" };
  }
}
