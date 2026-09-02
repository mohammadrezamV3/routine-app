import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { routineStatsForUsers, RoutineStats } from "@/lib/friendStats";
import { timeToMinutes, isWakeOnTime, DEFAULT_WAKE } from "@/lib/wakeSleep";
import { isValidUsername } from "@/lib/validate";
import { isoLocal, FA_WEEKDAY } from "@/lib/jalali";
import { sessionsThisWeekTotal, sessionsThisWeekDone, weekProgressPct, computeExerciseStreak, ExerciseLogRange } from "@/lib/exerciseStats";
import { sendPushToUser } from "@/lib/webPush";

// پیشرفت «بدنسازی» یک دوست — بر خلاف statsForUser (که روزانه‌ست، چون
// روتین هر روز تسک داره)، اینجا مبنا «جلسات این‌هفته» است، چون تمرین فقط
// روزهای باشگاه برنامه (gymDays) اتفاق می‌افته، نه هر روز.
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

// پیشرفت «کالری» یک دوست — روزهایی که توی هفت اخیر جمع کالری ثبت‌شده‌شون
// بین صفر تا هدف روزانه بوده («روز موفق»)، به‌علاوه‌ی استریک روزهای پشت‌سرهم
// موفق (دقیقا هم‌منطق CalorieStreakCard سمت کلاینت، ولی سمت سرور روی دیتای
// خود دوست چون کلاینت به FoodLogEntry دوست‌ها دسترسی نداره).
async function statsForUserCalorie(userId: string) {
  const target = await prisma.calorieTarget.findFirst({ where: { userId, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } });
  if (!target) return { completed: 0, total: 0, pct: 0, streak: 0 };

  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 90);
  const rows = await prisma.foodLogEntry.findMany({
    where: { userId, date: { gte: start, lte: now } },
    select: { date: true, customCalories: true },
  });
  const byDate: Record<string, number> = {};
  rows.forEach((r) => {
    const key = isoLocal(r.date);
    byDate[key] = (byDate[key] || 0) + (r.customCalories || 0);
  });

  function isSuccess(key: string): boolean {
    const total = byDate[key];
    return !!total && total > 0 && total <= target!.dailyTargetKcal;
  }

  let streak = 0;
  const cursor = new Date(now); cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 90; i++) {
    if (isSuccess(isoLocal(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); } else break;
  }

  let completed = 0;
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    if (isSuccess(isoLocal(d))) completed++;
  }
  const total = 7;
  return { completed, total, pct: Math.round((completed / total) * 100), streak };
}

// GET /api/friends?module=exercise|calorie → لیست دوستان تأییدشده + پیشرفت
// هرکدوم؛ exercise یعنی پیشرفت بدنسازی، calorie یعنی روزهای موفق کالری،
// وگرنه پیشرفت روتین روزانه (پیش‌فرض، برای داشبورد اصلی).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const module = req.nextUrl.searchParams.get("module");

  const rows = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: { id: true, name: true, username: true, avatarUrl: true } },
      addressee: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  const otherIds = rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));

  // مسیر پیش‌فرض (روتین) کلا دسته‌ای شد. مسیرهای ورزش/کالری هنوز به‌ازای هر
  // دوست کوئری می‌زنن، ولی هرکدوم فقط ۲ کوئری سبک‌ن و این دو تب خیلی کمتر
  // از داشبورد اصلی باز می‌شن — پس فعلا همون‌طور مونده.
  const routineStats = module === "exercise" || module === "calorie" ? null : await routineStatsForUsers(otherIds);
  const EMPTY: RoutineStats = { completed: 0, total: 0, pct: 0, streak: 0 };

  const friends = await Promise.all(
    rows.map(async (r) => {
      const isRequester = r.requesterId === userId;
      const other = isRequester ? r.addressee : r.requester;
      const stats = routineStats
        ? routineStats.get(other.id) ?? EMPTY
        : module === "exercise"
        ? await statsForUserExercise(other.id)
        : await statsForUserCalorie(other.id);
      return {
        friendshipId: r.id,
        id: other.id,
        name: other.name || other.username || "کاربر",
        username: other.username,
        avatarUrl: other.avatarUrl,
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
// حالت userId برای نتیجه‌ی جستجوی زنده‌ست (کاربر از قبل با آیدی پیدا شده)؛
// username برای سازگاری با ورودی مستقیم یوزرنیم.
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
    // بدون حساسیت به بزرگ/کوچکی حروف — هم‌راستا با قاعده‌ی ورود (lib/auth.ts):
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
      { error: existing.status === "ACCEPTED" ? "قبلا دوست هستید" : "درخواست قبلا ارسال شده" },
      { status: 409 }
    );
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: userId, addresseeId: target.id, status: "PENDING" },
  });

  // پوش حتی وقتی اپ addressee کاملا بسته‌ست هم می‌رسه — best-effort، اگه
  // VAPID تنظیم نشده باشه یا سابسکریپشنی نباشه، درخواست دوستی خودش هیچ‌وقت
  // نباید fail کنه.
  const requesterName = session!.user!.name || "یک کاربر";
  sendPushToUser(target.id, {
    title: "درخواست دوستی جدید",
    body: `${requesterName} می‌خواد باهات دوست بشه.`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, friendshipId: friendship.id });
}
