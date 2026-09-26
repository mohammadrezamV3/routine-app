import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { regenerateRoadmapPart } from "@/lib/roadmapGeneration";

// یک فراخوانیِ AI تا ۴۵ ثانیه (AI_TIMEOUT_MS) — همان دلیلِ روتِ ساخت.
export const maxDuration = 60;

/**
 * ساختنِ دوباره‌ی یک تکه از مسیر: `{target:"stage", n}` جزئیاتِ یک مرحله،
 * `{target:"guide"}` متنِ راهنما. سقفِ نرخ + اعتبارسنجی + AI + ذخیره در
 * lib/roadmapGeneration.ts (مشترک با /api/mobile/ai/roadmap/[id]/regenerate).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const r = await regenerateRoadmapPart(guard.userId, params.id, body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  if (r.target === "guide") return NextResponse.json({ guide: r.guide });
  return NextResponse.json({ stage: r.stage, stepProgress: r.stepProgress });
}
