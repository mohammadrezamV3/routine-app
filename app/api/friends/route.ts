import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDayStats, tasksForDate, ScheduleOpts } from "@/lib/schedule";
import { timeToMinutes, isWakeOnTime, DEFAULT_WAKE } from "@/lib/wakeSleep";
import { isValidUsername } from "@/lib/validate";
import { isoLocal, FA_WEEKDAY } from "@/lib/jalali";
import { sessionsThisWeekTotal, sessionsThisWeekDone, weekProgressPct, computeExerciseStreak, ExerciseLogRange } from "@/lib/exerciseStats";
import { sendPushToUser } from "@/lib/webPush";

// آمارِ روتینِ *همه‌ی* دوست‌ها با تعدادِ ثابتی کوئری.
//
// نسخه‌ی قبلی به‌ازای هر دوست جدا صدا زده می‌شد و هرکدوم ۵ کوئری می‌زد
// (customOccurrences + removedOccurrences + dailyEntryِ امروز + wakeSleepTimes
// + ۹۰ روز DailyEntry). با ۲۰ دوست یعنی ~۱۰۰ کوئری برای یک بار باز کردنِ
// داشبورد. حالا سه کوئریِ دسته‌ای می‌زنیم (`in:` روی کلِ لیستِ دوست‌ها) و
// بقیه‌ی محاسبه در حافظه انجام می‌شه — منطق مو‌به‌مو همونه.
type RoutineStats = { completed: number; total: number; pct: number; streak: number };

const STREAK_LOOKBACK_DAYS = 90;
// پنجره‌ی اولِ استریک. استریک به محضِ اولین روزِ ناقص می‌شکنه، پس تقریباً
// همیشه فقط چند روزِ آخر خونده می‌شه — ولی کدِ قبلی بی‌قیدوشرط هر ۹۰ روزِ
// *همه‌ی* دوست‌ها رو از قبل می‌کشید.
//
// اندازه‌گیری‌شده: یک درخواستِ /api/friends با ۱۰ دوست، ۹۰۰ ردیفِ DailyEntry
// (با کلِ JSONِ completedItems) می‌خوند تا یه پاسخِ ۲ کیلوبایتی بسازه — و
// همین باعث شده بود این روت ۹ برابر کندتر از بقیه باشه (۵۸ در برابر ۵۱۷
// req/s). حالا اول ۲۱ روز خونده می‌شه؛ فقط برای دوستی که استریکش به لبه‌ی
// همون پنجره رسید (یعنی واقعاً استریکِ بلندی داره) بقیه‌اش هم گرفته می‌شه.
const STREAK_FIRST_WINDOW_DAYS = 21;

async function routineStatsForUsers(userIds: string[]): Promise<Map<string, RoutineStats>> {
  const out = new Map<string, RoutineStats>();
  if (!userIds.length) return out;

  const now = new Date();
  const todayIso = isoLocal(now);
  const dayStart = (backDays: number) => {
    const d = new Date(now); d.setDate(d.getDate() - backDays); return new Date(isoLocal(d));
  };

  const [settingRows, dailyRows] = await Promise.all([
    prisma.userSetting.findMany({
      where: { userId: { in: userIds }, key: { in: ["customOccurrences", "removedOccurrences", "wakeSleepTimes"] } },
      select: { userId: true, key: true, value: true },
    }),
    // فقط پنجره‌ی اول — و فقط ستون‌هایی که واقعاً لازمن (id و createdAt و…
    // هیچ‌وقت استفاده نمی‌شدن ولی از دیتابیس میومدن و سریالایز می‌شدن)
    prisma.dailyEntry.findMany({
      where: { userId: { in: userIds }, date: { gte: dayStart(STREAK_FIRST_WINDOW_DAYS), lte: new Date(todayIso) } },
      select: { userId: true, date: true, completedItems: true, wakeUpAt: true },
    }),
  ]);

  const settingsByUser = new Map<string, Map<string, unknown>>();
  for (const r of settingRows) {
    if (!settingsByUser.has(r.userId)) settingsByUser.set(r.userId, new Map());
    settingsByUser.get(r.userId)!.set(r.key, r.value);
  }

  const needDeeper: { userId: string; opts: ScheduleOpts; wakeMinutes: number }[] = [];
  const dailyByUser = new Map<string, DailyMap>();
  for (const r of dailyRows) {
    if (!dailyByUser.has(r.userId)) dailyByUser.set(r.userId, {});
    dailyByUser.get(r.userId)![isoLocal(r.date)] = {
      tasks: (r.completedItems as Record<string, boolean>) ?? {},
      wake: r.wakeUpAt ? r.wakeUpAt.toISOString() : null,
    };
  }

  for (const userId of userIds) {
    const settings = settingsByUser.get(userId) ?? new Map();
    const opts: ScheduleOpts = {
      customOccurrences: (settings.get("customOccurrences") as any[]) ?? [],
      removedOccurrences: new Set((settings.get("removedOccurrences") as string[]) ?? []),
    };
    const entries = dailyByUser.get(userId) ?? {};

    const today = entries[todayIso];
    const dayStats = computeDayStats(new Date(), opts, today ? { tasks: today.tasks } : undefined);

    const wakeVal = settings.get("wakeSleepTimes") as { wake?: string } | undefined;
    const wakeMinutes = timeToMinutes(wakeVal?.wake || DEFAULT_WAKE);

    const { streak, hitEdge } = countStreak(entries, opts, wakeMinutes, STREAK_FIRST_WINDOW_DAYS);
    out.set(userId, { ...dayStats, streak });
    // استریکش تا ته پنجره ادامه داشت؟ پس باید عمیق‌تر نگاه کنیم.
    if (hitEdge) needDeeper.push({ userId, opts, wakeMinutes });
  }

  // مرحله‌ی دوم — در عمل تقریباً همیشه خالیه، چون استریکِ ۲۱ روزِ کامل نادره.
  if (needDeeper.length) {
    const deepRows = await prisma.dailyEntry.findMany({
      where: {
        userId: { in: needDeeper.map((d) => d.userId) },
        date: { gte: dayStart(STREAK_LOOKBACK_DAYS), lte: new Date(todayIso) },
      },
      select: { userId: true, date: true, completedItems: true, wakeUpAt: true },
    });
    const deepByUser = new Map<string, DailyMap>();
    for (const r of deepRows) {
      if (!deepByUser.has(r.userId)) deepByUser.set(r.userId, {});
      deepByUser.get(r.userId)![isoLocal(r.date)] = {
        tasks: (r.completedItems as Record<string, boolean>) ?? {},
        wake: r.wakeUpAt ? r.wakeUpAt.toISOString() : null,
      };
    }
    for (const d of needDeeper) {
      const { streak } = countStreak(deepByUser.get(d.userId) ?? {}, d.opts, d.wakeMinutes, STREAK_LOOKBACK_DAYS);
      const prev = out.get(d.userId);
      if (prev) out.set(d.userId, { ...prev, streak });
    }
  }

  return out;
}

type DailyMap = Record<string, { tasks: Record<string, boolean>; wake: string | null }>;

/**
 * روزهای کاملِ پشتِ‌سرهم از دیروز به عقب. `hitEdge` یعنی شمارش تا انتهای
 * پنجره ادامه داشت — یعنی ممکنه استریکِ واقعی از این هم بلندتر باشه و باید
 * با پنجره‌ی بزرگ‌تر دوباره حساب بشه.
 */
function countStreak(
  entries: DailyMap,
  opts: ScheduleOpts,
  wakeMinutes: number,
  windowDays: number
): { streak: number; hitEdge: boolean } {
  let streak = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < windowDays; i++) {
    const key = isoLocal(cursor);
    const expected = tasksForDate(new Date(cursor), opts);
    if (expected.length === 0) { cursor.setDate(cursor.getDate() - 1); continue; }
    const rec = entries[key];
    if (!rec) return { streak, hitEdge: false };
    const doneCount = expected.filter((t) => rec.tasks[t.id]).length;
    const wakeOK = rec.wake ? isWakeOnTime(rec.wake, wakeMinutes) : false;
    if (doneCount === expected.length && wakeOK) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else return { streak, hitEdge: false };
  }
  return { streak, hitEdge: true };
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

// پیشرفتِ «کالری»ِ یک دوست — روزهایی که توی هفتِ اخیر جمعِ کالریِ ثبت‌شده‌شون
// بین صفر تا هدفِ روزانه بوده («روزِ موفق»)، به‌علاوه‌ی استریکِ روزهای پشتِ‌سرهمِ
// موفق (دقیقاً هم‌منطقِ CalorieStreakCard سمتِ کلاینت، ولی سمتِ سرور روی دیتای
// خودِ دوست چون کلاینت به FoodLogEntry دوست‌ها دسترسی نداره).
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

// GET /api/friends?module=exercise|calorie → لیست دوستانِ تأییدشده + پیشرفتِ
// هرکدوم؛ exercise یعنی پیشرفتِ بدنسازی، calorie یعنی روزهای موفقِ کالری،
// وگرنه پیشرفتِ روتینِ روزانه (پیش‌فرض، برای داشبوردِ اصلی).
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

  // مسیرِ پیش‌فرض (روتین) کلاً دسته‌ای شد. مسیرهای ورزش/کالری هنوز به‌ازای هر
  // دوست کوئری می‌زنن، ولی هرکدوم فقط ۲ کوئریِ سبک‌ن و این دو تب خیلی کمتر
  // از داشبوردِ اصلی باز می‌شن — پس فعلاً همون‌طور مونده.
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

  // پوش حتی وقتی اپِ addressee کاملاً بسته‌ست هم می‌رسه — best-effort، اگه
  // VAPID تنظیم نشده باشه یا سابسکریپشنی نباشه، درخواستِ دوستی خودش هیچ‌وقت
  // نباید fail کنه.
  const requesterName = session!.user!.name || "یک کاربر";
  sendPushToUser(target.id, {
    title: "درخواست دوستی جدید",
    body: `${requesterName} می‌خواد باهات دوست بشه.`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, friendshipId: friendship.id });
}
