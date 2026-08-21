import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/friends/requests → درخواست‌های دوستیِ دریافت‌شده و هنوز تأییدنشده
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: { requester: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    requests: rows.map((r) => ({
      friendshipId: r.id,
      id: r.requester.id,
      name: r.requester.name || r.requester.username || "کاربر",
      username: r.requester.username,
      avatarUrl: r.requester.avatarUrl,
    })),
  });
}
