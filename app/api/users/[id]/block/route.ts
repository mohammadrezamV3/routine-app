import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { blockUser, unblockUser } from "@/lib/mobileSocialFriends";

// POST/DELETE /api/users/:id/block — بلاک/آنبلاکِ کاربر-به-کاربر. کاربرِ
// بلاک‌شده دیگر در جست‌وجوی دوستان دیده نمی‌شود (/api/friends/search).
// مستقل از دوستیِ Friendship — بلاک‌کردن دوستیِ موجود را پاک نمی‌کند (اگر
// کاربر بخواهد کامل قطع کند، از «حذف دوست» جدا استفاده می‌کند).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const r = await blockUser(userId, params.id);
  return NextResponse.json(r.body, { status: r.status });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const r = await unblockUser(userId, params.id);
  return NextResponse.json(r.body, { status: r.status });
}
