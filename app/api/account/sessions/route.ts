import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { listDeviceSessions, revokeDeviceSession, revokeOtherDeviceSessions } from "@/lib/deviceSessions";

// دستگاه‌های فعال حساب (پنل کاربری › امنیت).
//
// `sid` عمدا هیچ‌وقت به کلاینت برنمی‌گرده — فقط یک پرچم `current` که نشون
// می‌ده کدوم ردیف همین دستگاهه. خود sid از JWT (که httpOnly است) سمت سرور
// خونده می‌شه.
async function requireUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return null;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return { userId, sid: (token as any)?.sid as string | undefined };
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await listDeviceSessions(auth.userId);
  return NextResponse.json({
    sessions: rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
      lastSeenAt: r.lastSeenAt,
      current: !!auth.sid && r.sessionToken === auth.sid,
    })),
  });
}

// DELETE /api/account/sessions?id=<sessionId>  → ابطال یک دستگاه
// DELETE /api/account/sessions?others=1        → ابطال همه‌ی دستگاه‌های دیگر
export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  if (searchParams.get("others") === "1") {
    if (!auth.sid) return NextResponse.json({ error: tr("نشست فعلی شناسایی نشد", "Current session could not be identified") }, { status: 400 });
    const count = await revokeOtherDeviceSessions(auth.userId, auth.sid);
    return NextResponse.json({ ok: true, revoked: count });
  }

  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: tr("شناسه‌ی نشست لازم است", "Session ID is required") }, { status: 400 });
  const ok = await revokeDeviceSession(auth.userId, id);
  if (!ok) return NextResponse.json({ error: tr("این نشست پیدا نشد", "This session was not found") }, { status: 404 });
  return NextResponse.json({ ok: true, revoked: 1 });
}
