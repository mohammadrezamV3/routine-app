import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { rotateMobileSession } from "@/lib/mobileAuth";
import type { MobileRefreshResponse } from "@/lib/mobileApiContract";

// POST /api/mobile/auth/refresh { refreshToken }
// توکنِ قبلی همین‌جا مصرف و باطل می‌شه (rotation). ۴۰۱ یعنی کاربر باید دوباره وارد بشه.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers as any);
  if (!(await checkRateLimit(`mobile-refresh-ip:${ip}`, 60, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  const parsed = await readJsonBody<{ refreshToken?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const tokens = await rotateMobileSession(parsed.body.refreshToken as string, ip);
  if (!tokens) return NextResponse.json({ error: "نشست منقضی شده — دوباره وارد شو" }, { status: 401 });
  const body: MobileRefreshResponse = tokens;
  return NextResponse.json(body);
}
