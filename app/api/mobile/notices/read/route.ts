import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { markNoticesRead } from "@/lib/mobileNotices";

// POST /api/mobile/notices/read { ids: string[] } | { all: true } → فهرستِ تازه
export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-notices-read:${userId}`, 60, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  return NextResponse.json(await markNoticesRead(userId, parsed.body ?? {}));
}
