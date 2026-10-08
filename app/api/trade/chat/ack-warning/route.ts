import { NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// POST /api/trade/chat/ack-warning — کاربر اخطار فعلی‌اش را دیده؛ فقط
// timestamp دیدن را ثبت می‌کند تا دفعه‌ی بعد دوباره نمایش داده نشود.
export async function POST() {
  { const off = await sessionFeatureBlocked("tradeChat"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  await prisma.user.update({
    where: { id: guard.userId },
    data: { chatWarnSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
