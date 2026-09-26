import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { setFriendStar } from "@/lib/mobileSocialFriends";

// PATCH /api/users/:id/star { starred: boolean } — استاردادن/برداشتنِ
// استار از یک دوست. فقط بین دوستانِ تأییدشده معنا دارد (جلوگیری از
// اسپم‌کردنِ استار به هر کاربرِ discoverable).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const r = await setFriendStar(userId, params.id, !!body?.starred);
  return NextResponse.json(r.body, { status: r.status });
}
