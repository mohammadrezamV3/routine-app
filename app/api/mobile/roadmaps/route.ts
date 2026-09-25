import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkRoadmapForUser } from "@/lib/roadmapAccess";
import { listMobileRoadmaps } from "@/lib/mobileRoadmap";
import { etagMatches, sha } from "@/lib/mobileCatalog";
import { SYNC_ERROR_MODULE_LOCKED, type MobileRoadmapsResponse } from "@/lib/mobileApiContract";

// GET /api/mobile/roadmaps — فهرستِ کاملِ رودمپ‌های کاربر با محتوا و پیشرفت.
// گیت: lib/roadmapAccess.ts (همون قفلِ وب + ماژولِ ROADMAP). ETag روی کلِ پاسخ.
export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRoadmapForUser(userId)).ok) return NextResponse.json({ error: SYNC_ERROR_MODULE_LOCKED }, { status: 403 });
  if (!(await checkRateLimit(`mobile-roadmaps:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body: MobileRoadmapsResponse = { roadmaps: await listMobileRoadmaps(userId) };
  const json = JSON.stringify(body);
  const etag = `"${sha(json).slice(0, 32)}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache", "Content-Type": "application/json" };
  if (etagMatches(req.headers.get("if-none-match"), etag)) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(json, { status: 200, headers });
}
