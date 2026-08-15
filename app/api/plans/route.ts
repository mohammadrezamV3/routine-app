import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plans → پلن‌های فعالِ بازارِ خودِ کاربر + وضعیتِ اشتراکِ فعلیش،
// برای صفحه‌ی «اشتراک». قیمت‌گذاری بازاری‌ست (هر پلن مخصوص یک Market)، پس
// همیشه فقط پلن‌های هم‌بازارِ خودِ کاربر برمی‌گرده.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { market: true, isSuperAdmin: true } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [plans, subscription] = await Promise.all([
    prisma.plan.findMany({
      where: { market: user.market, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, key: true, nameFa: true, currency: true, priceMonthly: true, priceYearly: true,
        modules: { select: { module: true } },
      },
    }),
    prisma.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIAL"] } },
      orderBy: { createdAt: "desc" },
      select: { planId: true, status: true, currentPeriodEnd: true, plan: { select: { nameFa: true } } },
    }),
  ]);

  return NextResponse.json({
    plans: plans.map((p) => ({ ...p, modules: p.modules.map((m) => m.module) })),
    subscription,
    isSuperAdmin: user.isSuperAdmin,
  });
}
