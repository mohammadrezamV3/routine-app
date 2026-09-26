import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { acceptFriendRequest, removeFriendship } from "@/lib/mobileSocialFriends";

// PATCH /api/friends/:id → قبول‌کردن یک درخواست دوستی در انتظار (فقط addressee)
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const r = await acceptFriendRequest(userId, session!.user!.name, params.id);
  return NextResponse.json(r.body, { status: r.status });
}

// DELETE /api/friends/:id → رد‌کردن درخواست، لغو درخواست ارسالی، یا حذف یک دوستی تأییدشده
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const r = await removeFriendship(userId, params.id);
  return NextResponse.json(r.body, { status: r.status });
}
