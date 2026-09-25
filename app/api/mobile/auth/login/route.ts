import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { verifyPasswordLogin, startSmsTwoFactor, recordLoginEvent } from "@/lib/credentials";
import { cleanDeviceName, createMobileSession } from "@/lib/mobileAuth";
import type { MobileLoginResponse } from "@/lib/mobileApiContract";

// POST /api/mobile/auth/login { identifier, password, deviceName? }
//
// همون بررسیِ ورودِ وب (lib/credentials.ts — rate limit مشترک، bcrypt، مسدودی،
// دومرحله‌ای)، ولی به‌جای کوکی توکنِ Bearer برمی‌گردونه. هر شکستی (کاربر
// نیست / رمز غلط / مسدود) یک پیامِ عمومیِ یکسان می‌گیره — ضد user-enumeration.
// `requires2fa` فقط *بعد از رمزِ درست* برمی‌گرده، پس چیزی لو نمی‌ده.

const GENERIC = "اطلاعات ورود نادرست است";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers as any);
  const parsed = await readJsonBody<{ identifier?: unknown; password?: unknown; deviceName?: unknown }>(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const identifier = typeof parsed.body.identifier === "string" ? parsed.body.identifier.trim() : "";
  const password = typeof parsed.body.password === "string" ? parsed.body.password : "";
  if (!identifier || !password || identifier.length > 254 || password.length > 128) {
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  const result = await verifyPasswordLogin({ identifier, password, ip });
  if (!result.ok) {
    if (result.reason === "rate_limited") {
      return NextResponse.json({ error: "تعداد تلاش‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
    }
    if (result.reason === "db_error") {
      return NextResponse.json({ error: "سرور موقتا در دسترس نیست" }, { status: 503 });
    }
    if (result.reason === "requires_2fa") {
      const started = await startSmsTwoFactor(result.user);
      if (started.ok) {
        const body: MobileLoginResponse = { requires2fa: true, phoneHint: started.phoneHint };
        return NextResponse.json(body);
      }
      if (started.reason === "sms_failed") {
        return NextResponse.json({ error: "ارسال پیامک ناموفق بود — کمی بعد دوباره امتحان کن" }, { status: 502 });
      }
    }
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  const userAgent = req.headers.get("user-agent");
  recordLoginEvent(result.user.id, "mobile", ip, userAgent);
  const body: MobileLoginResponse = await createMobileSession(result.user, {
    deviceName: cleanDeviceName(parsed.body.deviceName),
    ip,
    userAgent,
  });
  return NextResponse.json(body);
}
