import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/referral → پنل «دعوت دوستان» کاربر: کدِ خودش، لینکِ اشتراک‌گذاری،
// موجودیِ فعلیِ کیفِ اعتبار، لیستِ دعوت‌هاش (فقط اسم/وضعیت — هیچ PII دیگه‌ای
// مثل شماره/ایمیلِ دعوت‌شونده افشا نمی‌شه)، و ۵۰ تراکنشِ آخرِ کیف.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      market: true,
      walletBalance: true,
      referralCode: { select: { code: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  // اگه به هر دلیلی (مثلاً داده‌ی قدیمی‌تر از قبلِ این فیچر) کدِ رفرال هنوز
  // ساخته نشده، همین‌جا بساز — نباید این روت خطا بده فقط چون یه ردیفِ کمکی
  // غایبه. همون قاعده‌ی تولیدِ کد که در signup/route.ts استفاده می‌شه.
  let code = user.referralCode?.code;
  if (!code) {
    code = (userId.slice(0, 6) + Math.random().toString(36).slice(2, 6)).toUpperCase();
    await prisma.referralCode.create({ data: { userId, code } }).catch(() => {});
  }

  const origin = req.nextUrl.origin;
  const currency: "IRR" | "USD" = user.market === "IRAN" ? "IRR" : "USD";

  // فقط دعوت‌هایی که از کدِ خودِ همین کاربر استفاده شدن — IDOR-safe چون
  // فیلتر روی referralCode.userId (همون کاربرِ لاگین‌کرده) انجام می‌شه.
  const usages = await prisma.referralUsage.findMany({
    where: { referralCode: { userId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      rewardedAt: true,
      rewardAmount: true,
      inviteeUser: { select: { name: true, username: true } },
    },
  });

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      amount: true,
      balanceAfter: true,
      description: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    code,
    shareUrl: `${origin}/subscription?ref=${code}`,
    walletBalance: user.walletBalance,
    currency,
    invites: usages.map((u) => ({
      id: u.id,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      rewardedAt: u.rewardedAt ? u.rewardedAt.toISOString() : null,
      rewardAmount: u.rewardAmount,
      inviteeName: u.inviteeUser.name || u.inviteeUser.username || null,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}
