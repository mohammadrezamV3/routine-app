import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST/DELETE /api/users/:id/block — بلاک/آنبلاکِ کاربر-به-کاربر. کاربرِ
// بلاک‌شده دیگر در جست‌وجوی دوستان دیده نمی‌شود (/api/friends/search).
// مستقل از دوستیِ Friendship — بلاک‌کردن دوستیِ موجود را پاک نمی‌کند (اگر
// کاربر بخواهد کامل قطع کند، از «حذف دوست» جدا استفاده می‌کند).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const targetUserId = params.id;
  if (targetUserId === userId) return NextResponse.json({ error: "not allowed" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } },
    create: { blockerId: userId, blockedId: targetUserId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await prisma.userBlock.deleteMany({ where: { blockerId: userId, blockedId: params.id } });
  return NextResponse.json({ ok: true });
}
