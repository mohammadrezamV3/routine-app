import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkRoadmapForUser } from "@/lib/roadmapAccess";
import { regenerateRoadmapPart } from "@/lib/roadmapGeneration";
import { listMobileRoadmaps } from "@/lib/mobileRoadmap";
import { SYNC_ERROR_MODULE_LOCKED, type MobileRoadmapRegenerateResponse } from "@/lib/mobileApiContract";

export const maxDuration = 60;

// POST /api/mobile/ai/roadmap/{id}/regenerate { target: "guide" } | { target: "stage", n }
// نسخه‌ی Bearerِ POST /api/roadmaps/{id}/regenerate — همون هسته
// (lib/roadmapGeneration.ts): سطلِ مشترکِ rate limit، ثبتِ مصرفِ AI، ضد IDOR.
// جواب کلِ رودمپِ به‌روز است تا کشِ آفلاینِ اپ یک‌جا عوض بشه.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRoadmapForUser(userId)).ok) return NextResponse.json({ error: SYNC_ERROR_MODULE_LOCKED }, { status: 403 });

  const parsed = await readJsonBody(req, 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const r = await regenerateRoadmapPart(userId, params.id, parsed.body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const [roadmap] = await listMobileRoadmaps(userId, params.id);
  if (!roadmap) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body: MobileRoadmapRegenerateResponse = { roadmap };
  return NextResponse.json(body);
}
