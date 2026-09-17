import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { editRoadmapGraph } from "@/lib/aiClient";
import { computeProgress } from "@/lib/roadmapGraph";
import { loadOwnedRoadmap, saveNewVersion } from "@/lib/roadmapStore";
import { logEvent } from "@/lib/roadmapEvents";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";

// ویرایشِ رودمپ با یک دستورِ زبانِ طبیعی («پایتون رو بلدم، حذفش کن»).
//
// نسخه‌ی قبلی همیشه در history می‌ماند — یک ویرایشِ بدِ مدل نباید کارِ
// کاربر را نابود کند و باید قابلِ برگشت باشد.
export const maxDuration = 60;

const LIMIT = 10;
const WINDOW_MS = 30 * 60_000;
const MAX_INSTRUCTION = 400;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  if (!(await checkRateLimit(`roadmap-edit:${userId}`, LIMIT, WINDOW_MS))) {
    return NextResponse.json({ error: "تعداد ویرایش‌ها زیاد شد — کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const raw = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  if (!raw) return NextResponse.json({ error: "بگو چه تغییری می‌خوای" }, { status: 400 });
  const instruction = clampText(raw, MAX_INSTRUCTION);

  const current = await loadOwnedRoadmap(params.id, userId);
  if (!current) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });
  if (!current.graph) return NextResponse.json({ error: "این رودمپ گراف ندارد" }, { status: 400 });

  let result;
  try {
    result = await editRoadmapGraph(current.graph, instruction, userId);
  } catch (err: any) {
    logEvent("roadmap_generation_failed", { userId, roadmapId: params.id, kind: "edit", reason: err?.message });
    return NextResponse.json({ error: err?.message || "ویرایش انجام نشد" }, { status: 500 });
  }

  const { version, progress } = await saveNewVersion(current, result.graph, instruction);

  logEvent("roadmap_updated", {
    userId, roadmapId: params.id, version,
    durationMs: result.meta.durationMs, attempts: result.meta.attempts,
    nodesBefore: current.graph.stages.reduce((n, s) => n + s.nodes.length, 0),
    nodesAfter: result.graph.stages.reduce((n, s) => n + s.nodes.length, 0),
  });

  return NextResponse.json({
    ok: true,
    version,
    graph: result.graph,
    nodeProgress: progress,
    progress: computeProgress(result.graph, progress),
  });
}
