import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkRoadmapForUser } from "@/lib/roadmapAccess";
import { createAiRoadmap } from "@/lib/roadmapGeneration";
import { listMobileRoadmaps } from "@/lib/mobileRoadmap";
import { SYNC_ERROR_MODULE_LOCKED, type MobileRoadmapResponse } from "@/lib/mobileApiContract";

export const maxDuration = 60;

// POST /api/mobile/ai/roadmap { topic, goal? } — نسخه‌ی Bearerِ POST /api/roadmaps.
// همون هسته (lib/roadmapGeneration.ts): سطلِ مشترکِ rate limit، ثبتِ مصرفِ AI.
export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRoadmapForUser(userId)).ok) return NextResponse.json({ error: SYNC_ERROR_MODULE_LOCKED }, { status: 403 });

  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const r = await createAiRoadmap(userId, parsed.body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const roadmap = (await listMobileRoadmaps(userId)).find((x) => x.id === r.id)!;
  const body: MobileRoadmapResponse = { roadmap };
  return NextResponse.json(body, { status: 201 });
}
