import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDayStats, tasksForDate, ScheduleOpts } from "@/lib/schedule";
import { timeToMinutes, isWakeOnTime, DEFAULT_WAKE } from "@/lib/wakeSleep";
import { isValidUsername } from "@/lib/validate";
import { isoLocal, FA_WEEKDAY } from "@/lib/jalali";
import { sessionsThisWeekTotal, sessionsThisWeekDone, weekProgressPct, computeExerciseStreak, ExerciseLogRange } from "@/lib/exerciseStats";

// استریکِ روزهای پشت‌سرهمِ کاملِ یک کاربرِ دلخواه — همون منطقِ lib/useMyStreak.ts،
// ولی سمتِ سرور و مستقیم روی Prisma، چون دوست‌ها نمی‌تونن به تاریخچه‌ی
// DailyEntry همدیگه از سمتِ کلاینت دسترسی داشته باشن.
async function streakForUser(userId: string, opts: ScheduleOpts): Promise<number> {
  const wakeRow = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "wakeSleepTimes" } } });
  const wakeVal = (wakeRow?.value as { wake?: string } | undefined) ?? undefined;
  const wakeMinutes = timeToMinutes(wakeVal?.wake || DEFAULT_WAKE);

  const now = new Date();
  const rangeEnd = new Date(now); rangeEnd.setDate(rangeEnd.getDate() - 1);
  const rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 90);

  const rows = await prisma.dailyEntry.findMany({
    where: { userId, date: { gte: new Date(isoLocal(rangeStart)), lte: new Date(isoLocal(rangeEnd)) } },
  });
  const entries: Record<string, { tasks: Record<string, boolean>; wake: string | null }> = {};
  rows.forEach((r) => {
    entries[isoLocal(r.date)] = {
      tasks: (r.completedItems as Record<string, boolean>) ?? {},
      wake: r.wakeUpAt ? r.wakeUpAt.toISOString() : null,
    };
  });

  let s = 0;
  const cursor = new Date(now);
  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 90; i++) {
    const key = isoLocal(cursor);
    const expected = tasksForDate(new Date(cursor), opts);
    if (expected.length === 0) { cursor.setDate(cursor.getDate() - 1); continue; }
    const rec = entries[key];
    if (!rec) break;
    const doneCount = expected.filter((t) => rec.tasks[t.id]).length;
    const wakeOK = rec.wake ? isWakeOnTime(rec.wake, wakeMinutes) : false;
    const fullDay = doneCount === expected.length && wakeOK;
    if (fullDay) { s++; cursor.setDate(cursor.getDate() - 1); } else break;
  }
  return s;
}

// درصدِ پیشرفتِ امروز + استریکِ یک کاربرِ دلخواه — مستقیم از UserSetting/DailyEntry،
// بدون افشای خودِ برنامه‌ها (اسم/ساعت درسا) به دوست‌ها، فقط عددهای خلاصه‌شده.
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
  const dayStats = computeDayStats(new Date(), opts, record);
  const streak = await streakForUser(userId, opts);
  return { ...dayStats, streak };
}

// پیشرفتِ «بدنسازی»ِ یک دوست — بر خلافِ statsForUser (که روزانه‌ست، چون
// روتین هر روز تسک داره)، اینجا مبنا «جلساتِ این‌هفته» است، چون تمرین فقط
// روزهای باشگاهِ برنامه (gymDays) اتفاق می‌افته، نه هر روز.
async function statsForUserExercise(userId: string) {
  const plan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { startDate: "desc" } });
  if (!plan) return { completed: 0, total: 0, pct: 0, streak: 0 };

  const gymDays = (plan.gymDays as string[] | null) ?? [];
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 90);

  const rows = await prisma.exerciseLog.findMany({
    where: { userId, planId: plan.id, date: { gte: start, lte: now } },
  });
  const logs: ExerciseLogRange = {};
  rows.forEach((r) => {
    logs[isoLocal(r.date)] = { completed: r.completed, completedItems: (r.completedItems as string[] | null) ?? [] };
  });

  const streak = computeExerciseStreak(gymDays, (d) => FA_WEEKDAY[d.getDay()], logs, now);
  return {
    completed: sessionsThisWeekDone(logs, now),
    total: sessionsThisWeekTotal(gymDays),
    pct: weekProgressPct(gymDays, logs, now),
    streak,
  };
}

// GET /api/friends?module=exercise → لیست دوستانِ تأییدشده + پیشرفتِ هرکدوم؛
// module=exercise یعنی فقط پیشرفتِ بدنسازی نشون بده (برای داشبوردِ بدنسازی)،
// وگرنه پیشرفتِ روتینِ روزانه (پیش‌فرض، برای داشبوردِ اصلی).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const module = req.nextUrl.searchParams.get("module");
  const statsFn = module === "exercise" ? statsForUserExercise : statsForUser;

  const rows = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: { id: true, name: true, username: true } },
      addressee: { select: { id: true, name: true, username: true } },
    },
  });

  const friends = await Promise.all(
    rows.map(async (r) => {
      const isRequester = r.requesterId === userId;
      const other = isRequester ? r.addressee : r.requester;
      const stats = await statsFn(other.id);
      return {
        friendshipId: r.id,
        id: other.id,
        name: other.name || other.username || "کاربر",
        username: other.username,
        favorite: isRequester ? r.favoritedByRequester : r.favoritedByAddressee,
        ...stats,
      };
    })
  );

  // فیوریت‌ها اول
  friends.sort((a, b) => Number(b.favorite) - Number(a.favorite));

  return NextResponse.json({ friends });
}

// POST /api/friends  { userId } یا { username }  → ارسال درخواست دوستی.
// حالتِ userId برای نتیجه‌ی جستجوی زنده‌ست (کاربر از قبل با آیدی پیدا شده)؛
// username برای سازگاری با ورودیِ مستقیمِ یوزرنیم.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const targetUserId = String(body?.userId || "").trim();
  const username = String(body?.username || "").trim();

  let target;
  if (targetUserId) {
    target = await prisma.user.findUnique({ where: { id: targetUserId } });
  } else {
    if (!isValidUsername(username)) {
      return NextResponse.json({ error: "یوزرنیم نامعتبر است" }, { status: 400 });
    }
    // بدون حساسیت به بزرگ/کوچکیِ حروف — هم‌راستا با قاعده‌ی ورود (lib/auth.ts):
    // "Ali_2024" و "ali_2024" باید یک کاربر پیدا بشن.
    target = await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  }
  if (!target) return NextResponse.json({ error: "کاربری پیدا نشد" }, { status: 404 });
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
