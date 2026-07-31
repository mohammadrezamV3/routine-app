import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/friends/:id → قبول‌کردنِ یک درخواست دوستیِ در انتظار (فقط addressee)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || friendship.addresseeId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (friendship.status !== "PENDING") {
    return NextResponse.json({ error: "این درخواست قبلاً پاسخ داده شده" }, { status: 409 });
  }

  await prisma.friendship.update({ where: { id: params.id }, data: { status: "ACCEPTED" } });
  return NextResponse.json({ ok: true });
}

// DELETE /api/friends/:id → رد‌کردنِ درخواست، لغوِ درخواستِ ارسالی، یا حذفِ یک دوستیِ تأییدشده
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
