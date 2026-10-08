import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, extendSubscriptionDays } from "@/lib/adminUsers";

// POST { days } — تمدید دستی پایان دوره‌ی اشتراک فعال (دسترسی subscriptions)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("subscriptions");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => null);
  try {
    const end = await extendSubscriptionDays(guard, params.id, body?.days);
    return NextResponse.json({ ok: true, currentPeriodEnd: end });
  } catch (e) { return adminErrorResponse(e); }
}
