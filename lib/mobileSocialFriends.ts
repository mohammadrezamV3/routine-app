// هسته‌ی مشترکِ «دوستان» — روت‌های وب (app/api/friends/*, app/api/users/[id]/*)
// و موبایل (app/api/mobile/social/*) هر دو فقط همین توابع رو صدا می‌زنن تا
// قواعدِ حریم خصوصی/IDOR فقط یک جا زندگی کنن:
//   • جست‌وجو فقط کاربرانِ discoverable و بدونِ بلاکِ دوطرفه.
//   • پروفایل: بلاک → ۴۰۴؛ discoverable=false → فقط برای دوستِ تأییدشده؛
//     شماره فقط با sharePhone (lib/friendProfile.ts).
//   • هر عملیات روی friendshipId فقط برای دو طرفِ همون رابطه — وگرنه ۴۰۴
//     (نه ۴۰۳، تا وجودِ رابطه‌ی دیگران لو نره).
// هویت (userId) و isSuperAdmin/اسمِ نمایشی همیشه از لایه‌ی احرازِ هویتِ خودِ
// روت میاد، نه از بدنه‌ی درخواست.
import { prisma } from "@/lib/prisma";
import { routineStatsForUsers, RoutineStats } from "@/lib/friendStats";
import { isValidUsername, clampQuery } from "@/lib/validate";
import { isoLocal, FA_WEEKDAY } from "@/lib/jalali";
import { sessionsThisWeekTotal, sessionsThisWeekDone, weekProgressPct, computeExerciseStreak, ExerciseLogRange } from "@/lib/exerciseStats";
import { sendPushToUser } from "@/lib/webPush";
import { checkRateLimit } from "@/lib/rateLimit";
import { getFriendProfile } from "@/lib/friendProfile";

export type CoreResult<T = unknown> = { status: number; body: T };
const ok = <T>(body: T, status = 200): CoreResult<T> => ({ status, body });
const err = (status: number, error: string): CoreResult<{ error: string }> => ({ status, body: { error } });

// پیشرفت «بدنسازی» یک دوست — بر خلاف statsForUser (که روزانه‌ست، چون
// روتین هر روز تسک داره)، اینجا مبنا «جلسات این‌هفته» است، چون تمرین فقط
// روزهای باشگاه برنامه (gymDays) اتفاق می‌افته، نه هر روز.
async function statsForUserExercise(userId: string): Promise<RoutineStats> {
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
async function statsForUserCalorie(userId: string): Promise<RoutineStats> {
  const target = await prisma.calorieTarget.findFirst({ where: { userId, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } });
  if (!target) return { completed: 0, total: 0, pct: 0, streak: 0 };

  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 90);
  const rows = await prisma.foodLogEntry.findMany({
    where: { userId, deletedAt: null, date: { gte: start, lte: now } },
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

export type FriendListItem = RoutineStats & {
  friendshipId: string;
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  favorite: boolean;
};

/**
 * دوستانِ تأییدشده + پیشرفتِ هرکدوم. module: "exercise" → بدنسازی،
 * "calorie" → روزهای موفقِ کالری، هر چیز دیگه → روتینِ روزانه (پیش‌فرض).
 */
export async function listFriends(userId: string, module: string | null): Promise<FriendListItem[]> {
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
  return friends;
}

/**
 * ارسالِ درخواستِ دوستی. `{ userId }` برای نتیجه‌ی جست‌وجو، `{ username }`
 * برای ورودیِ مستقیم (بدون حساسیت به بزرگ/کوچکی — هم‌راستا با lib/auth.ts).
 */
export async function sendFriendRequest(
  userId: string,
  requesterName: string | null | undefined,
  body: unknown
): Promise<CoreResult> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const targetUserId = String(b.userId || "").trim();
  const username = String(b.username || "").trim();

  let target;
  if (targetUserId) {
    target = await prisma.user.findUnique({ where: { id: targetUserId } });
  } else {
    if (!isValidUsername(username)) return err(400, "یوزرنیم نامعتبر است");
    target = await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  }
  if (!target) return err(404, "کاربری پیدا نشد");
  if (target.id === userId) return err(400, "نمی‌تونی به خودت درخواست بدی");

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    },
  });
  if (existing) {
    return err(409, existing.status === "ACCEPTED" ? "قبلا دوست هستید" : "درخواست قبلا ارسال شده");
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: userId, addresseeId: target.id, status: "PENDING" },
  });

  // پوش حتی وقتی اپ addressee کاملا بسته‌ست هم می‌رسه — best-effort، اگه
  // VAPID تنظیم نشده باشه یا سابسکریپشنی نباشه، درخواست دوستی خودش هیچ‌وقت
  // نباید fail کنه.
  const name = requesterName || "یک کاربر";
  sendPushToUser(target.id, {
    title: "درخواست دوستی جدید",
    body: `${name} می‌خواد باهات دوست بشه.`,
  }).catch(() => {});

  return ok({ ok: true, friendshipId: friendship.id });
}

/** درخواست‌های دوستیِ دریافت‌شده و هنوز تأییدنشده */
export async function listIncomingRequests(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: { requester: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    friendshipId: r.id,
    id: r.requester.id,
    name: r.requester.name || r.requester.username || "کاربر",
    username: r.requester.username,
    avatarUrl: r.requester.avatarUrl,
  }));
}

/** قبول‌کردنِ یک درخواستِ در انتظار — فقط addressee */
export async function acceptFriendRequest(
  userId: string,
  accepterName: string | null | undefined,
  friendshipId: string
): Promise<CoreResult> {
  if (!friendshipId) return err(404, "not found");
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== userId) return err(404, "not found");
  if (friendship.status !== "PENDING") return err(409, "این درخواست قبلا پاسخ داده شده");

  await prisma.friendship.update({ where: { id: friendshipId }, data: { status: "ACCEPTED" } });

  // به کسی که اول درخواست داده بود اطلاع بده که قبول شد — حتی وقتی اپش
  // بسته‌ست (best-effort، هیچ‌وقت نباید خود قبول‌کردن رو fail کنه).
  const name = accepterName || "یک کاربر";
  sendPushToUser(friendship.requesterId, {
    title: "درخواست دوستی قبول شد",
    body: `${name} درخواست دوستیت رو قبول کرد.`,
  }).catch(() => {});

  return ok({ ok: true });
}

/** رد‌کردنِ درخواست، لغوِ درخواستِ ارسالی، یا حذفِ دوستیِ تأییدشده — هر دو طرف */
export async function removeFriendship(userId: string, friendshipId: string): Promise<CoreResult> {
  if (!friendshipId) return err(404, "not found");
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
    return err(404, "not found");
  }
  await prisma.friendship.delete({ where: { id: friendshipId } });
  return ok({ ok: true });
}

/** فیوریتِ یک‌طرفه‌ی یک دوستیِ تأییدشده */
export async function setFriendFavorite(userId: string, friendshipId: string, favorite: boolean): Promise<CoreResult> {
  if (!friendshipId) return err(404, "not found");
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
    return err(404, "not found");
  }
  if (friendship.status !== "ACCEPTED") return err(409, "هنوز دوست نیستید");

  const isRequester = friendship.requesterId === userId;
  await prisma.friendship.update({
    where: { id: friendshipId },
    data: isRequester ? { favoritedByRequester: favorite } : { favoritedByAddressee: favorite },
  });
  return ok({ ok: true, favorite });
}

/**
 * جست‌وجوی زنده با یوزرنیم. سقفِ نرخ (۳۰/دقیقه روی کاربر، ۶۰/دقیقه روی IP)
 * برای همه بجز سوپریوزر؛ فقط discoverable و بدونِ بلاکِ دوطرفه.
 */
export async function searchUsers(userId: string, isSuperAdmin: boolean, ip: string, rawQuery: string | null): Promise<CoreResult> {
  if (
    !isSuperAdmin &&
    (!(await checkRateLimit(`friends-search:${userId}`, 30, 60 * 1000)) || !(await checkRateLimit(`friends-search-ip:${ip}`, 60, 60 * 1000)))
  ) {
    return err(429, "درخواست‌های زیاد — کمی بعد دوباره امتحان کن");
  }

  const q = clampQuery(rawQuery, 60);
  if (q.length < 2) return ok({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      username: { contains: q, mode: "insensitive" },
      // پنل کاربری › تنظیمات آریون › حریم خصوصی — کسی که discoverable رو
      // خاموش کرده توی جست‌وجوی دوستان دیده نمی‌شه (دوستی از‌قبل‌موجود یا
      // درخواست درحال‌انتظار همچنان جای دیگه‌ای نمایش داده می‌شه، فقط جست‌وجوی جدید مسدوده)
      discoverable: true,
      // بلاکِ کاربر-به-کاربر دوطرفه است: کسی که بلاک کرده‌ام یا کسی که
      // من را بلاک کرده، دیگر در جست‌وجوی دوستان دیده نمی‌شود.
      NOT: {
        OR: [
          { blockedByUsers: { some: { blockerId: userId } } },
          { blockedUsers: { some: { blockedId: userId } } },
        ],
      },
    },
    select: { id: true, name: true, username: true, avatarUrl: true },
    take: 12,
  });
  if (!users.length) return ok({ users: [] });

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

  return ok({
    users: users.map((u) => ({
      id: u.id,
      name: u.name || u.username || "کاربر",
      username: u.username,
      status: statusFor(u.id),
    })),
  });
}

async function isAcceptedFriend(a: string, b: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return !!friendship;
}

/**
 * پروفایلِ یک کاربر (پاپ‌آپِ کلیک روی اسم). شرطِ دوستی نیست (از «افزودن
 * دوست» هم باز می‌شه)، شرطِ discoverable/بلاک هست:
 * - مقصد discoverable=false و دوست نیستند → ۴۰۴
 * - هرکدام دیگری را بلاک کرده → ۴۰۴
 */
export async function getVisibleProfile(viewerId: string, targetUserId: string): Promise<CoreResult> {
  if (!targetUserId || targetUserId === viewerId) return err(404, "not found");

  const [target, blockRow] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, discoverable: true } }),
    prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: viewerId },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (!target || blockRow) return err(404, "not found");

  if (!target.discoverable && !(await isAcceptedFriend(viewerId, targetUserId))) return err(404, "not found");

  const profile = await getFriendProfile(viewerId, targetUserId);
  if (!profile) return err(404, "not found");
  return ok({ profile });
}

/** استار دادن/برداشتن — فقط بین دوستانِ تأییدشده */
export async function setFriendStar(userId: string, targetUserId: string, starred: boolean): Promise<CoreResult> {
  if (targetUserId === userId) return err(400, "not allowed");
  if (!(await isAcceptedFriend(userId, targetUserId))) return err(409, "هنوز دوست نیستید");

  if (starred) {
    await prisma.friendStar.upsert({
      where: { giverId_receiverId: { giverId: userId, receiverId: targetUserId } },
      create: { giverId: userId, receiverId: targetUserId },
      update: {},
    });
  } else {
    await prisma.friendStar.deleteMany({ where: { giverId: userId, receiverId: targetUserId } });
  }

  const starsCount = await prisma.friendStar.count({ where: { receiverId: targetUserId } });
  return ok({ ok: true, starred, starsCount });
}

/** بلاکِ کاربر-به-کاربر (دوستیِ موجود را پاک نمی‌کند) */
export async function blockUser(userId: string, targetUserId: string): Promise<CoreResult> {
  if (targetUserId === userId) return err(400, "not allowed");
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) return err(404, "not found");
  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } },
    create: { blockerId: userId, blockedId: targetUserId },
    update: {},
  });
  return ok({ ok: true });
}

export async function unblockUser(userId: string, targetUserId: string): Promise<CoreResult> {
  await prisma.userBlock.deleteMany({ where: { blockerId: userId, blockedId: targetUserId } });
  return ok({ ok: true });
}
