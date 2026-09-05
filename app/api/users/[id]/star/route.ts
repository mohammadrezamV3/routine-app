import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/users/:id/star { starred: boolean } — استاردادن/برداشتنِ
// استار از یک دوست. فقط بین دوستانِ تأییدشده معنا دارد (جلوگیری از
// اسپم‌کردنِ استار به هر کاربرِ discoverable).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const targetUserId = params.id;
  if (targetUserId === userId) return NextResponse.json({ error: "not allowed" }, { status: 400 });

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: userId },
      ],
    },
    select: { id: true },
  });
  if (!friendship) return NextResponse.json({ error: "هنوز دوست نیستید" }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const starred = !!body?.starred;

  if (starred) {
    await prisma.friendStar.upsert({
      where: { giverId_receiverId: { giverId: userId, receiverId: targetUserId } },
      create: { giverId: userId, receiverId: targetUserId },
      update: {},
    });
  } else {
    await prisma.friendStar.deleteMany({ where: { giverId: userId, receiverId: targetUserId } });
  }

  const starsCount = await prisma.friendStar.count({ where: { receiverId: targetUserId } });
  return NextResponse.json({ ok: true, starred, starsCount });
}
