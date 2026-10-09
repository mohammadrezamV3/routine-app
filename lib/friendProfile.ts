// پروفایل کامل یک دوست — پاپ‌آپی که با کلیک روی اسم دوست باز می‌شود.
// این‌جا زندگی می‌کند (نه داخل route.ts) تا هم روت پروفایل هم بوت‌استرپ/
// جاهای دیگر بتوانند صدایش بزنند بدون تکرار منطق.
import { prisma } from "@/lib/prisma";
import { NAME_STYLE_SELECT, nameFlags } from "@/lib/nameStyle";
import { countRowProgress } from "@/lib/roadmapPlan";
import { routineStatsForUsers } from "@/lib/friendStats";
import type { WeekPcts } from "@/lib/friendWeek";
import { tr } from "@/lib/i18n";

export type FriendRelation = "none" | "friends" | "pending_sent" | "pending_received";

export type FriendProfile = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  golden: boolean;
  staff: boolean;
  bannerUrl: string | null;
  bio: string | null;
  /** فقط وقتی خود کاربر از تنظیمات › حریم خصوصی «sharePhone» را روشن کرده — وگرنه همیشه null. */
  phone: string | null;
  streak: number;
  bestStreak: number;
  starsCount: number;
  starredByMe: boolean;
  roadmapsCompleted: number;
  plansCompleted: number;
  planName: string | null;
  /** رابطه‌ی بیننده با این کاربر — فقط ردیف Friendship بین همین دو نفر */
  relation: FriendRelation;
  /** شناسه‌ی همون ردیف (برای قبول/لغو/حذف از داخل پاپ‌آپ) — بدون رابطه null */
  friendshipId: string | null;
  /**
   * پیشرفت امروز و 7 روز اخیر — *فقط* برای دوست تاییدشده، همون داده‌ای که
   * کارت دوستان از قبل نشونش می‌ده. برای غیردوست (نتیجه‌ی جست‌وجو) همیشه null.
   */
  today: { completed: number; total: number; pct: number } | null;
  week: WeekPcts | null;
};

/**
 * تعداد مسیرهایی که کاربر تمام کرده — یعنی همه‌ی مرحله‌هایش در progress
 * علامت خورده. steps یک آرایه‌ی JSON است (نه یک عدد ذخیره‌شده)، پس این‌جا
 * باید واقعا هر مسیر را بخوانیم و بشماریم، نه یک کوئری COUNT ساده.
 */
async function countCompletedRoadmaps(userId: string): Promise<number> {
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    select: { steps: true, progress: true },
  });
  let done = 0;
  for (const r of roadmaps) {
    const c = countRowProgress(r.steps, r.progress);
    if (c.total > 0 && c.done === c.total) done++;
  }
  return done;
}

export async function getFriendProfile(viewerId: string, targetUserId: string): Promise<FriendProfile | null> {
  const [user, starsCount, starredByMe, roadmapsCompleted, plansCompleted, activeSub, liveStats, rel] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, username: true, avatarUrl: true, bannerUrl: true, bio: true, bestStreak: true, phone: true, sharePhone: true, ...NAME_STYLE_SELECT },
    }),
    prisma.friendStar.count({ where: { receiverId: targetUserId } }),
    prisma.friendStar.findUnique({ where: { giverId_receiverId: { giverId: viewerId, receiverId: targetUserId } } }),
    countCompletedRoadmaps(targetUserId),
    // «برنامه‌ی تمام‌شده» — برنامه‌ی تمرینی غیرفعال یعنی کاربر از آن گذشته
    // (جایگزینش کرده)؛ فیلد صریح completed روی ExercisePlan وجود ندارد.
    prisma.exercisePlan.count({ where: { userId: targetUserId, isActive: false } }),
    prisma.subscription.findFirst({
      where: { userId: targetUserId, status: "ACTIVE", currentPeriodEnd: { gte: new Date() } },
      orderBy: { currentPeriodEnd: "desc" },
      select: { plan: { select: { nameFa: true } } },
    }),
    routineStatsForUsers([targetUserId]),
    prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: viewerId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: viewerId },
        ],
      },
      select: { id: true, status: true, requesterId: true },
    }),
  ]);

  if (!user) return null;

  const live = liveStats.get(targetUserId);
  const liveStreak = live?.streak ?? 0;
  const relation: FriendRelation = !rel
    ? "none"
    : rel.status === "ACCEPTED"
    ? "friends"
    : rel.requesterId === viewerId
    ? "pending_sent"
    : "pending_received";
  const isFriend = relation === "friends";
  const bestStreak = Math.max(user.bestStreak, liveStreak);
  // آپدیت lazy — فقط وقتی رکورد جدیدی زده شده. fire-and-forget: خواندن
  // پروفایل نباید منتظر نوشتن بماند.
  if (bestStreak > user.bestStreak) {
    prisma.user.update({ where: { id: targetUserId }, data: { bestStreak } }).catch(() => {});
  }

  return {
    id: user.id,
    name: user.name || tr("کاربر", "User"),
    username: user.username,
    avatarUrl: user.avatarUrl,
    ...nameFlags(user),
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    phone: user.sharePhone ? user.phone : null,
    streak: liveStreak,
    bestStreak,
    starsCount,
    starredByMe: !!starredByMe,
    roadmapsCompleted,
    plansCompleted,
    planName: activeSub?.plan?.nameFa ?? null,
    relation,
    friendshipId: rel?.id ?? null,
    today: isFriend && live ? { completed: live.completed, total: live.total, pct: live.pct } : null,
    week: isFriend && live ? live.week : null,
  };
}
