import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { prisma } from "@/lib/prisma";

// GET /api/users/blocked — فهرستِ کاربرهایی که همین کاربر بلاک کرده، برای
// بخشِ «تنظیمات › افراد بلاک‌شده» که بشود از آن‌جا آنبلاک کرد.
export async function GET() {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.userBlock.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: "desc" },
    select: { blocked: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });

  return NextResponse.json({ users: rows.map((r) => r.blocked) });
}
