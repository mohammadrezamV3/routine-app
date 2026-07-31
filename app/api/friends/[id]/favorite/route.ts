import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/friends/:id/favorite  { favorite: boolean }  → فیوریت‌کردنِ یک
// دوستیِ تأییدشده، فقط برای سمتِ خودِ کاربر (شخصیه، نه دوطرفه — دوستِ مقابل
// می‌تونه بدونِ اطلاع از این، خودش هم جدا فیوریتش کنه یا نکنه).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const favorite = !!body?.favorite;

  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (friendship.status !== "ACCEPTED") {
    return NextResponse.json({ error: "هنوز دوست نیستید" }, { status: 409 });
  }

  const isRequester = friendship.requesterId === userId;
  await prisma.friendship.update({
    where: { id: params.id },
    data: isRequester ? { favoritedByRequester: favorite } : { favoritedByAddressee: favorite },
  });

  return NextResponse.json({ ok: true, favorite });
}
