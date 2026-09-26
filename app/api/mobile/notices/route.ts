import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getMobileUserId } from "@/lib/mobileAuth";
import { listNotices } from "@/lib/mobileNotices";

// GET /api/mobile/notices — اطلاعیه‌های سروری + تعدادِ نخونده (بَج)
export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-notices:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  return NextResponse.json(await listNotices(userId), { headers: { "Cache-Control": "private, no-store" } });
}
