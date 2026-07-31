import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDayStats, ScheduleOpts } from "@/lib/schedule";
import { isValidUsername } from "@/lib/validate";
import { isoLocal } from "@/lib/jalali";

// درصدِ پیشرفتِ امروزِ یک کاربرِ دلخواه — مستقیم از UserSetting/DailyEntry،
// بدون افشای خودِ برنامه‌ها (اسم/ساعت درسا) به دوست‌ها، فقط عدد خلاصه‌شده.
async function statsForUser(userId: string) {
  const [customRow, removedRow, dailyRow] = await Promise.all([
    prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "customOccurrences" } } }),
    prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "removedOccurrences" } } }),
    prisma.dailyEntry.findUnique({ where: { userId_date: { userId, date: new Date(isoLocal(new Date())) } } }),
  ]);
  const opts: ScheduleOpts = {
    customOccurrences: (customRow?.value as any[]) ?? [],
    removedOccurrences: new Set((removedRow?.value as string[]) ?? []),
  };
  const record = dailyRow ? { tasks: (dailyRow.completedItems as Record<string, boolean>) ?? {} } : undefined;
  return computeDayStats(new Date(), opts, record);
}

// GET /api/friends → لیست دوستانِ تأییدشده + درصد پیشرفتِ امروزِ هرکدوم
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: { id: true, name: true, username: true } },
      addressee: { select: { id: true, name: true, username: true } },
    },
  });

  const friends = await Promise.all(
    rows.map(async (r) => {
      const other = r.requesterId === userId ? r.addressee : r.requester;
      const stats = await statsForUser(other.id);
      return {
        friendshipId: r.id,
        id: other.id,
        name: other.name || other.username || "کاربر",
        username: other.username,
        ...stats,
      };
    })
  );

  return NextResponse.json({ friends });
}

// POST /api/friends  { username }  → ارسال درخواست دوستی
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || "").trim();
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "یوزرنیم نامعتبر است" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: "کاربری با این یوزرنیم پیدا نشد" }, { status: 404 });
  if (target.id === userId) return NextResponse.json({ error: "نمی‌تونی به خودت درخواست بدی" }, { status: 400 });

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.status === "ACCEPTED" ? "قبلاً دوست هستید" : "درخواست قبلاً ارسال شده" },
      { status: 409 }
    );
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: userId, addresseeId: target.id, status: "PENDING" },
  });

  return NextResponse.json({ ok: true, friendshipId: friendship.id });
}
