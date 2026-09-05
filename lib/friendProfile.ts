// پروفایلِ کاملِ یک دوست — پاپ‌آپی که با کلیک روی اسمِ دوست باز می‌شود.
// این‌جا زندگی می‌کند (نه داخل route.ts) تا هم روتِ پروفایل هم بوت‌استرپ/
// جاهای دیگر بتوانند صدایش بزنند بدون تکرارِ منطق.
import { prisma } from "@/lib/prisma";
import { routineStatsForUsers } from "@/lib/friendStats";

export type FriendProfile = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  streak: number;
  bestStreak: number;
  starsCount: number;
  starredByMe: boolean;
  roadmapsCompleted: number;
  plansCompleted: number;
  planName: string | null;
};

/**
 * تعدادِ رودمپ‌هایی که کاربر تمام کرده — یعنی همه‌ی ایستگاه‌هایش در
 * progress علامت خورده. stations یک آرایه‌ی JSON است (نه یک عدد ذخیره‌شده)،
 * پس این‌جا باید واقعاً هر رودمپ را بخوانیم و بشماریم، نه یک کوئریِ COUNT ساده.
 */
async function countCompletedRoadmaps(userId: string): Promise<number> {
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    select: { stations: true, progress: true },
  });
  let done = 0;
  for (const r of roadmaps) {
    const stations = Array.isArray(r.stations) ? r.stations : [];
    if (!stations.length) continue;
    const progress = (r.progress as Record<string, boolean> | null) ?? {};
    const doneCount = stations.filter((_, i) => progress[String(i)]).length;
    if (doneCount === stations.length) done++;
  }
  return done;
}

export async function getFriendProfile(viewerId: string, targetUserId: string): Promise<FriendProfile | null> {
  const [user, starsCount, starredByMe, roadmapsCompleted, plansCompleted, activeSub, liveStats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, username: true, avatarUrl: true, bestStreak: true },
    }),
    prisma.friendStar.count({ where: { receiverId: targetUserId } }),
    prisma.friendStar.findUnique({ where: { giverId_receiverId: { giverId: viewerId, receiverId: targetUserId } } }),
    countCompletedRoadmaps(targetUserId),
    // «برنامه‌ی تمام‌شده» — برنامه‌ی تمرینیِ غیرفعال یعنی کاربر از آن گذشته
    // (جایگزینش کرده)؛ فیلد صریحِ completed روی ExercisePlan وجود ندارد.
    prisma.exercisePlan.count({ where: { userId: targetUserId, isActive: false } }),
    prisma.subscription.findFirst({
      where: { userId: targetUserId, status: "ACTIVE", currentPeriodEnd: { gte: new Date() } },
      orderBy: { currentPeriodEnd: "desc" },
      select: { plan: { select: { nameFa: true } } },
    }),
    routineStatsForUsers([targetUserId]),
  ]);

  if (!user) return null;

  const liveStreak = liveStats.get(targetUserId)?.streak ?? 0;
  const bestStreak = Math.max(user.bestStreak, liveStreak);
  // آپدیتِ lazy — فقط وقتی رکورد جدیدی زده شده. fire-and-forget: خواندنِ
  // پروفایل نباید منتظرِ نوشتن بماند.
  if (bestStreak > user.bestStreak) {
    prisma.user.update({ where: { id: targetUserId }, data: { bestStreak } }).catch(() => {});
  }

  return {
    id: user.id,
    name: user.name || "کاربر",
    username: user.username,
    avatarUrl: user.avatarUrl,
    streak: liveStreak,
    bestStreak,
    starsCount,
    starredByMe: !!starredByMe,
    roadmapsCompleted,
    plansCompleted,
    planName: activeSub?.plan?.nameFa ?? null,
  };
}
