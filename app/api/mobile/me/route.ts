import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { buildMobileUser, getMobileUserId } from "@/lib/mobileAuth";
import type { MobileMeResponse } from "@/lib/mobileApiContract";

// GET /api/mobile/me — همون MobileUserِ login/refresh (پلن، ماژول‌ها با انقضا،
// شماره‌ی ماسک‌شده) تا اپ بعد از خرید/تمدید بدونِ refreshِ توکن تازه‌ش کنه.
export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-me:${userId}`, 60, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body: MobileMeResponse = { user: await buildMobileUser(user) };
  return NextResponse.json(body);
}
