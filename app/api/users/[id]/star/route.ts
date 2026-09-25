import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setFriendStar } from "@/lib/mobileSocialFriends";

// PATCH /api/users/:id/star { starred: boolean } — استاردادن/برداشتنِ
// استار از یک دوست. فقط بین دوستانِ تأییدشده معنا دارد (جلوگیری از
// اسپم‌کردنِ استار به هر کاربرِ discoverable).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const r = await setFriendStar(userId, params.id, !!body?.starred);
  return NextResponse.json(r.body, { status: r.status });
}
