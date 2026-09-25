import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { verifySmsTwoFactorLogin, recordLoginEvent } from "@/lib/credentials";
import { cleanDeviceName, createMobileSession } from "@/lib/mobileAuth";
import type { MobileVerify2faResponse } from "@/lib/mobileApiContract";

// POST /api/mobile/auth/verify-2fa { identifier, code, deviceName? }
//
// مرحله‌ی دومِ ورودِ دومرحله‌ای — عینا همون تابعی که provider «sms-2fa»ِ وب
// صدا می‌زنه (lib/credentials.ts): کد از صفر اعتبارسنجی و مصرف می‌شه، با
// همون سطل‌های rate limit.

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers as any);
  const parsed = await readJsonBody<{ identifier?: unknown; code?: unknown; deviceName?: unknown }>(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const identifier = typeof parsed.body.identifier === "string" ? parsed.body.identifier.trim() : "";
  const code = typeof parsed.body.code === "string" ? parsed.body.code.trim() : "";
  if (!identifier || identifier.length > 254 || !/^\d{4,8}$/.test(code)) {
    return NextResponse.json({ error: "کد نادرست یا منقضی است" }, { status: 401 });
  }

  const result = await verifySmsTwoFactorLogin({ identifier, code, ip });
  if (!result.ok) {
    if (result.reason === "rate_limited") {
      return NextResponse.json({ error: "تعداد تلاش‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
    }
    if (result.reason === "db_error") {
      return NextResponse.json({ error: "سرور موقتا در دسترس نیست" }, { status: 503 });
    }
    return NextResponse.json({ error: "کد نادرست یا منقضی است" }, { status: 401 });
  }

  const userAgent = req.headers.get("user-agent");
  recordLoginEvent(result.user.id, "mobile-2fa", ip, userAgent);
  const body: MobileVerify2faResponse = await createMobileSession(result.user, {
    deviceName: cleanDeviceName(parsed.body.deviceName),
    ip,
    userAgent,
  });
  return NextResponse.json(body);
}
