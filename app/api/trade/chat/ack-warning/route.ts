import { NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { ackChatWarning } from "@/lib/mobileSocialChat";

// POST /api/trade/chat/ack-warning — کاربر اخطارِ فعلی‌اش را دیده؛ فقط
// timestampِ دیدن را ثبت می‌کند تا دفعه‌ی بعد دوباره نمایش داده نشود.
export async function POST() {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const r = await ackChatWarning(guard.userId);
  return NextResponse.json(r.body, { status: r.status });
}
