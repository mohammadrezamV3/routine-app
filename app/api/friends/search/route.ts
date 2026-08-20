import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { clampQuery } from "@/lib/validate";

// GET /api/friends/search?q=...  → جستجوی زنده‌ی کاربر با یوزرنیم/اسم، برای
// تایپ‌آهدِ «افزودن دوست». برای هر نتیجه وضعیتِ فعلیِ رابطه رو هم برمی‌گردونه
// تا سمتِ کلاینت بشه به‌جای دکمه‌ی ارسال، وضعیتِ «قبلاً دوستید»/«در انتظار» رو نشون داد.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  const isSuperAdmin = !!(session!.user as any).isSuperAdmin;
  if (!isSuperAdmin && (!checkRateLimit(`friends-search:${userId}`, 30, 60 * 1000) || !checkRateLimit(`friends-search-ip:${ip}`, 60, 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const q = clampQuery(req.nextUrl.searchParams.get("q"), 60);
  if (q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true },
    take: 12,
  });
  if (!users.length) return NextResponse.json({ users: [] });

  const relations = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, addresseeId: { in: users.map((u) => u.id) } },
        { addresseeId: userId, requesterId: { in: users.map((u) => u.id) } },
      ],
    },
  });

  const statusFor = (otherId: string): "none" | "friends" | "pending_sent" | "pending_received" => {
    const rel = relations.find((r) => r.requesterId === otherId || r.addresseeId === otherId);
    if (!rel) return "none";
    if (rel.status === "ACCEPTED") return "friends";
    return rel.requesterId === userId ? "pending_sent" : "pending_received";
  };

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name || u.username || "کاربر",
      username: u.username,
      status: statusFor(u.id),
    })),
  });
}
