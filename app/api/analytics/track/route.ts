import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// فقط رویدادهای شناخته‌شده‌ای که پنل Owner واقعا برای Funnel نیازشون داره —
// یک allowlist صریح، نه هر type دلخواهی که کلاینت بفرسته (هم‌راستا با الگوی
// lib/userSettingKeys.ts برای /api/settings/[key])
const ALLOWED_EVENT_TYPES = new Set(["view_subscription_page"]);

// POST /api/analytics/track { type }  — بی‌صدا، fire-and-forget از سمت کلاینت.
// مهمون هم می‌تونه بفرسته (userId اختیاریه) چون Funnel از قبل از ثبت‌نام
// شروع می‌شه.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!checkRateLimit(`analytics-track:${ip}`, 60, 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const type = body?.type;
  if (typeof type !== "string" || !ALLOWED_EVENT_TYPES.has(type)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  await prisma.analyticsEvent.create({ data: { userId: userId || null, type } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
