import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getMobileModuleAccess, getMobileUserId } from "@/lib/mobileAuth";
import { parseIsoDateTime } from "@/lib/mobileSync";
import { pullChanges } from "@/lib/mobileSyncStore";
import { pullRoadmapProgress } from "@/lib/mobileRoadmap";

// GET /api/mobile/sync/pull?since=<cursor>
// همه‌ی رکوردهای فاز ۱ِ همین کاربر که بعد از since عوض شدن (+ tombstoneِ تسک‌ها).
// بدونِ since = همه‌چیز. hasMore=true یعنی فورا با cursorِ جدید دوباره بخواه.
export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-pull:${userId}`, 240, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const raw = req.nextUrl.searchParams.get("since");
  let since: Date | null = null;
  if (raw) {
    since = parseIsoDateTime(raw);
    if (!since) return NextResponse.json({ error: "since نامعتبر است" }, { status: 400 });
  }

  // موجودیت‌های بدنسازی/کالری/رودمپ فقط با دسترسیِ فعالِ همون ماژول (lockedModules در پاسخ)
  const access = await getMobileModuleAccess(userId);
  const body = await pullChanges(userId, since, access);
  // پیشرفتِ رودمپ جدا از mobileSyncStore خونده می‌شه (lib/mobileRoadmap.ts). کمی
  // بعد از زمانِ cursor خونده می‌شه، پس هر چی وسطش عوض بشه دفعه‌ی بعد دوباره میاد.
  if (access.ROADMAP) body.roadmapProgress = await pullRoadmapProgress(userId, since);
  return NextResponse.json(body);
}
