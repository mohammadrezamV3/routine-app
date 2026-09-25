import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getTicket } from "@/lib/mobileSupport";
import type { MobileTicketDetailResponse } from "@/lib/mobileAccountContract";

// GET /api/mobile/support/tickets/:id — where: {id, userId}؛ تیکتِ دیگران → ۴۰۴
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-support-read:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  const ticket = await getTicket(userId, params.id);
  if (!ticket) return NextResponse.json({ error: "تیکت پیدا نشد" }, { status: 404 });
  const body: MobileTicketDetailResponse = { ticket };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
