import { prisma } from "@/lib/prisma";
import { generateRoadmapPlan } from "@/lib/aiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";

// هسته‌ی ساختِ رودمپ با AI — مشترک بینِ POST /api/roadmaps (وب) و
// POST /api/mobile/ai/roadmap (اپ). گیت (سوپریوزر/ماژول) کارِ route است؛
// این‌جا سقفِ نرخ (همون سطلِ `roadmap:<userId>` برای هر دو مسیر)، اعتبارسنجی،
// فراخوانیِ AI (ثبتِ مصرف داخلِ generateRoadmapPlan) و ذخیره.

const LIMIT = 6;
const WINDOW_MS = 30 * 60_000;
const MAX_TOPIC = 120;
const MAX_GOAL = 300;

export async function createAiRoadmap(
  userId: string,
  body: unknown
): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  // ساختِ هر مسیر یک فراخوانیِ گرانِ AI است (گاهی سه‌تا، با حلقه‌ی تعمیر) —
  // سقف روی خودِ کاربر است، نه روی IP.
  if (!(await checkRateLimit(`roadmap:${userId}`, LIMIT, WINDOW_MS))) {
    return { ok: false, status: 429, error: "تعداد ساختِ مسیر زیاد شد — کمی بعد دوباره امتحان کن" };
  }

  const topic = clampText(String((body as any)?.topic || "").trim(), MAX_TOPIC);
  if (!topic) return { ok: false, status: 400, error: "بگو چی می‌خوای یاد بگیری" };
  const goalRaw = String((body as any)?.goal || "").trim();
  const goal = goalRaw ? clampText(goalRaw, MAX_GOAL) : undefined;

  let plan;
  try {
    const result = await generateRoadmapPlan({ topic, goal }, userId);
    plan = result.plan;
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
      generatedByAi: true,
    },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}
