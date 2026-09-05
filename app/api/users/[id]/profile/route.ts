import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFriendProfile } from "@/lib/friendProfile";

// GET /api/users/:id/profile — پروفایلِ یک کاربر (پاپ‌آپِ کلیک روی اسم).
// برخلافِ نسخه‌ی اولیه (که فقط برای دوستِ تأییدشده باز می‌شد)، طبقِ
// درخواستِ صریح باید توی «افزودن دوست» هم قابل دیدن باشه — یعنی قبل از
// این‌که دوست شوند. پس این‌جا شرط دوستی نیست، شرطِ discoverable/بلاک است:
// - کاربرِ مقصد discoverable=false باشد و دوست نباشند → دیده نمی‌شود
// - هرکدام از دو طرف دیگری را بلاک کرده باشد → دیده نمی‌شود
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  if (!viewerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const targetUserId = params.id;
  if (targetUserId === viewerId) {
    // خودِ کاربر روی اسمِ خودش کلیک نمی‌کند، ولی اگر شد بی‌معنی است
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [target, blockRow] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, discoverable: true } }),
    prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: viewerId },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (!target || blockRow) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!target.discoverable) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: viewerId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: viewerId },
        ],
      },
      select: { id: true },
    });
    if (!friendship) return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const profile = await getFriendProfile(viewerId, targetUserId);
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ profile });
}
