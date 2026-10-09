import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NAME_STYLE_SELECT, nameFlags } from "@/lib/nameStyle";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { clampQuery } from "@/lib/validate";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// GET /api/friends/search?q=...  → جستجوی زنده‌ی کاربر با یوزرنیم/اسم، برای
// تایپ‌آهد «افزودن دوست». برای هر نتیجه وضعیت فعلی رابطه رو هم برمی‌گردونه
// تا سمت کلاینت بشه به‌جای دکمه‌ی ارسال، وضعیت «قبلا دوستید»/«در انتظار» رو نشون داد.
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("friends"); if (off) return off; }
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  const isSuperAdmin = !!(session!.user as any).isSuperAdmin;
  if (!isSuperAdmin && (!(await checkRateLimit(`friends-search:${userId}`, 30, 60 * 1000)) || !(await checkRateLimit(`friends-search-ip:${ip}`, 60, 60 * 1000)))) {
    return NextResponse.json({ error: tr("درخواست‌های زیاد — کمی بعد دوباره امتحان کن", "Too many requests — try again shortly") }, { status: 429 });
  }

  const q = clampQuery(req.nextUrl.searchParams.get("q"), 60);
  if (q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      username: { contains: q, mode: "insensitive" },
      // پنل کاربری › تنظیمات آریون › حریم خصوصی — کسی که discoverable رو
      // خاموش کرده توی جست‌وجوی دوستان دیده نمی‌شه (دوستی از‌قبل‌موجود یا
      // درخواست درحال‌انتظار همچنان جای دیگه‌ای نمایش داده می‌شه، فقط جست‌وجوی جدید مسدوده)
      discoverable: true,
      // بلاک کاربر-به-کاربر دوطرفه است: کسی که بلاک کرده‌ام یا کسی که
      // من را بلاک کرده، دیگر در جست‌وجوی دوستان دیده نمی‌شود.
      NOT: {
        OR: [
          { blockedByUsers: { some: { blockerId: userId } } },
          { blockedUsers: { some: { blockedId: userId } } },
        ],
      },
    },
    select: { id: true, name: true, username: true, avatarUrl: true, ...NAME_STYLE_SELECT },
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

  const relationOf = (otherId: string) => relations.find((r) => r.requesterId === otherId || r.addresseeId === otherId);
  const statusFor = (otherId: string): "none" | "friends" | "pending_sent" | "pending_received" => {
    const rel = relationOf(otherId);
    if (!rel) return "none";
    if (rel.status === "ACCEPTED") return "friends";
    return rel.requesterId === userId ? "pending_sent" : "pending_received";
  };

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name || u.username || tr("کاربر", "User"),
      username: u.username,
      // avatarUrl از اول select می‌شد ولی هیچ‌وقت برنمی‌گشت — نتایج همیشه آواتار پیش‌فرض داشتن
      avatarUrl: u.avatarUrl,
      ...nameFlags(u),
      status: statusFor(u.id),
      // شناسه‌ی رابطه‌ی خود کاربر با این نفر (اگه هست) — برای قبول/لغو مستقیم از نتیجه
      friendshipId: relationOf(u.id)?.id ?? null,
    })),
  });
}
