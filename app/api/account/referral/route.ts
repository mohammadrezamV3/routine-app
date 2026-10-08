import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { withLiveSync } from "@/lib/realtime";
import { CUSTOM_REFERRAL_CODE_RE, normalizeReferralCode } from "@/lib/referral";

// GET  /api/account/referral → کد دعوت خود کاربر + آمار (چند دوست با کدش خرید
//      اولشون رو کردن) + موجودی کیفِ اعتبار (lib/wallet.ts — قاعده‌ها در lib/referral.ts)
// PATCH /api/account/referral { code } → انتخاب اسم کد توسط خود کاربر. یکتا در
//      برابر کد دعوت بقیه *و* کدهای تخفیف ادمین (DiscountCode اول چک می‌شه،
//      پس کد هم‌نام عملا مرده می‌شد).
async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [row, invitedPaid, user] = await Promise.all([
    prisma.referralCode.findUnique({ where: { userId }, select: { code: true } }),
    prisma.referralUsage.count({ where: { status: "REWARDED", referralCode: { userId } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } }),
  ]);
  return NextResponse.json({ code: row?.code ?? null, invitedPaid, walletBalance: user?.walletBalance ?? 0 });
}

async function handlePATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(`referral-code:${userId}`, 5, 60 * 60 * 1000)) || !(await checkRateLimit(`referral-code-ip:${ip}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const code = normalizeReferralCode(String(body?.code || ""));
  if (!CUSTOM_REFERRAL_CODE_RE.test(code)) {
    return NextResponse.json({ error: "کد دعوت باید 4 تا 16 حرف انگلیسی یا عدد باشه" }, { status: 400 });
  }

  const [taken, promo] = await Promise.all([
    prisma.referralCode.findFirst({ where: { code, userId: { not: userId } }, select: { id: true } }),
    prisma.discountCode.findUnique({ where: { code }, select: { id: true } }),
  ]);
  if (taken || promo) return NextResponse.json({ error: "این کد قبلا گرفته شده — یه اسم دیگه امتحان کن" }, { status: 409 });

  try {
    await prisma.referralCode.upsert({ where: { userId }, update: { code }, create: { userId, code } });
  } catch {
    return NextResponse.json({ error: "این کد قبلا گرفته شده — یه اسم دیگه امتحان کن" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, code });
}

// کد دعوت روی بقیه‌ی دستگاه‌های همین کاربر همون لحظه (lib/realtime.ts)
export const PATCH = withLiveSync(["account"], handlePATCH);
