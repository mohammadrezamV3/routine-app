import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getUserDetail, setUserBlocked } from "@/lib/adminAnalytics";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const detail = await getUserDetail(params.id);
  if (!detail) return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
  return NextResponse.json(detail);
}

// PATCH { blocked: boolean } — فعلاً تنها اقدامِ واقعیِ «تغییر وضعیت» که این
// اپ بک‌اندِ لازم رو براش داره. اقدامات دیگه (تغییر پلن دستی و…) از قبل از
// طریقِ سیستمِ اشتراک/پرداختِ موجود انجام می‌شن، نه از این‌جا.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  if (typeof body?.blocked !== "boolean") {
    return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  }
  if (params.id === guard.userId && body.blocked) {
    return NextResponse.json({ error: "نمی‌تونی حساب خودت رو مسدود کنی" }, { status: 400 });
  }

  const updated = await setUserBlocked(guard.userId, params.id, body.blocked);
  return NextResponse.json({ ok: true, user: updated });
}
