import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setFriendFavorite } from "@/lib/mobileSocialFriends";

// PATCH /api/friends/:id/favorite  { favorite: boolean }  → فیوریت‌کردن یک
// دوستی تأییدشده، فقط برای سمت خود کاربر (شخصیه، نه دوطرفه — دوست مقابل
// می‌تونه بدون اطلاع از این، خودش هم جدا فیوریتش کنه یا نکنه).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const r = await setFriendFavorite(userId, params.id, !!body?.favorite);
  return NextResponse.json(r.body, { status: r.status });
}
