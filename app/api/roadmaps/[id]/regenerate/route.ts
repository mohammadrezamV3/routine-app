import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { generateRoadmapGraph } from "@/lib/aiClient";
import { computeProgress } from "@/lib/roadmapGraph";
import { parseAnswers, parseProfile } from "@/lib/roadmapInput";
import { loadOwnedRoadmap, saveNewVersion } from "@/lib/roadmapStore";
import { logEvent } from "@/lib/roadmapEvents";
import { checkRateLimit } from "@/lib/rateLimit";

// ساختِ دوباره‌ی همین رودمپ با همان پروفایلِ ذخیره‌شده.
//
// طبقِ خواسته‌ی صریح: اطلاعاتِ قبلیِ کاربر (موضوع، هدف، سطح، وقت، جواب‌ها)
// حفظ می‌شود و نسخه‌ی قبلی هم در history می‌ماند — یعنی اگر تولیدِ تازه
// بدتر از قبلی بود، برگشت‌پذیر است.
export const maxDuration = 60;

const LIMIT = 4;
const WINDOW_MS = 30 * 60_000;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  if (!(await checkRateLimit(`roadmap-regen:${userId}`, LIMIT, WINDOW_MS))) {
    return NextResponse.json({ error: "تعداد بازسازی‌ها زیاد شد — کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const current = await loadOwnedRoadmap(params.id, userId);
  if (!current) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });

  // پروفایل از خودِ ردیف بازساخته می‌شود (نه از کلاینت) — هم اطلاعاتِ قبلی
  // حفظ می‌شود، هم کلاینت نمی‌تواند با یک پروفایلِ ساختگی چیز دیگری بسازد.
  const parsed = parseProfile({
    topic: current.topic,
    goal: current.profile.goal,
    level: current.profile.level,
    deadlineMonths: current.profile.deadlineMonths,
    resourceLang: current.profile.resourceLang,
    budget: current.profile.budget,
    learnStyle: current.profile.learnStyle,
    schedule: current.profile.schedule,
  });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const answers = parseAnswers(current.profile.answers);
  const startedAt = Date.now();
  logEvent("roadmap_generation_started", { userId, roadmapId: params.id, kind: "regenerate" });

  let result;
  try {
    result = await generateRoadmapGraph(parsed.profile, answers, userId);
  } catch (err: any) {
    logEvent("roadmap_generation_failed", {
      userId, roadmapId: params.id, kind: "regenerate",
      durationMs: Date.now() - startedAt, reason: err?.message,
    });
    return NextResponse.json({ error: err?.message || "بازسازی انجام نشد" }, { status: 500 });
  }

  const { version, progress } = await saveNewVersion(current, result.graph, "بازسازیِ کامل");

  logEvent("roadmap_generation_completed", {
    userId, roadmapId: params.id, kind: "regenerate", version,
    durationMs: result.meta.durationMs, attempts: result.meta.attempts,
  });

  return NextResponse.json({
    ok: true,
    version,
    graph: result.graph,
    nodeProgress: progress,
    progress: computeProgress(result.graph, progress),
  });
}
