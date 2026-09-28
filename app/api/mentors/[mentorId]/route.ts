import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound } from "@/lib/mentorGuard";
import { MENTOR_CARD_INCLUDE, loadMentorStats, toMentorCard, usersBlockEachOther } from "@/lib/mentorServer";
import { displayName } from "@/lib/inAppNotify";
import { isMentorSaved } from "@/lib/savedMentors";
import { advanceWaitlist, countWaiting, loadMyWaitlist } from "@/lib/mentorWaitlistServer";

const REVIEWS_LIMIT = 30;

type ReviewRow = { id: string; rating: number; body: string | null; createdAt: Date; student: { name: string | null; lastName: string | null; username: string | null; avatarUrl: string | null } };

function toReview(r: ReviewRow) {
  return { id: r.id, rating: r.rating, body: r.body, createdAt: r.createdAt, student: { name: displayName(r.student), avatarUrl: r.student.avatarUrl } };
}

// GET /api/mentors/:mentorId (mentorId = userIdِ منتور) → پروفایلِ عمومی + نظرات.
// دیده می‌شه اگه: خودم باشم، یا پروفایل منتشرشده/غیرمعلق باشه، یا با این
// منتور رابطه‌ای (هر وضعیتی جز BLOCKED) داشته باشم تا شاگردِ فعلی/قبلی بتونه
// صفحه‌ی منتورش رو باز کنه. صاحبِ مسدود/حذف‌شده یا بلاکِ دوطرفه → ۴۰۴.
export async function GET(_req: Request, { params }: { params: { mentorId: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const mentorId = params.mentorId;
  if (typeof mentorId !== "string" || !mentorId || mentorId.length > 64) return notFound();

  const isSelf = mentorId === me;
  // صفِ انتظار روی همین مسیرِ خواندن جلو می‌رود (بدونِ کرانِ بیرونی) تا
  // «ظرفیت تکمیل»/نوبتِ من به‌روز باشد؛ بدونِ صف فقط یک count ارزان است
  await advanceWaitlist(mentorId);
  // سرعت: قبلا پنج مرحله‌ی پشتِ‌سرِهم به دیتابیس می‌رفت (پروفایل → رابطه →
  // بلاک → آمار/نظرات). حالا همه هم‌زمان؛ شرطِ دیده‌شدن بعدش سنجیده می‌شه و
  // اگه رد شد همون ۴۰۴ برمی‌گرده (داده‌ای به بیرون نمی‌ره).
  const [profile, myMentorship, blocked, stats, reviews, myReviewRow, saved, myWaitlist, waitlistCount] = await Promise.all([
    prisma.mentorProfile.findFirst({
      where: { userId: mentorId, user: { isBlocked: false, deletedAt: null } },
      include: { ...MENTOR_CARD_INCLUDE, user: { select: { ...MENTOR_CARD_INCLUDE.user.select, createdAt: true } } },
    }),
    isSelf
      ? Promise.resolve(null)
      : prisma.mentorship.findUnique({
          where: { mentorId_studentId: { mentorId, studentId: me } },
          select: { id: true, status: true, initiatedBy: true, startedAt: true },
        }),
    isSelf ? Promise.resolve(false) : usersBlockEachOther(me, mentorId),
    loadMentorStats([mentorId]),
    prisma.mentorReview.findMany({
      where: { mentorId, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: REVIEWS_LIMIT,
      select: { id: true, rating: true, body: true, createdAt: true, student: { select: { name: true, lastName: true, username: true, avatarUrl: true } } },
    }),
    isSelf
      ? Promise.resolve(null)
      : prisma.mentorReview.findUnique({
          where: { mentorId_studentId: { mentorId, studentId: me } },
          select: { id: true, rating: true, body: true, createdAt: true, student: { select: { name: true, lastName: true, username: true, avatarUrl: true } } },
        }),
    isSelf ? Promise.resolve(false) : isMentorSaved(me, mentorId),
    isSelf ? Promise.resolve(null) : loadMyWaitlist(mentorId, me),
    countWaiting(mentorId),
  ]);
  if (!profile) return notFound();

  if (!isSelf) {
    // احرازِ هویت اجباریه: منتورِ تأییدنشده فقط برای شاگردهای قبلی/فعلیش دیده می‌شه
    const discoverable = profile.published && !profile.suspendedAt && profile.identityStatus === "VERIFIED";
    const related = !!myMentorship && myMentorship.status !== "BLOCKED";
    if (!discoverable && !related) return notFound();
    if (blocked) return notFound();
  }

  const s = stats.get(mentorId);

  // نظر فقط از شاگردی که رابطه‌اش واقعاً شروع شده (ACTIVE یا ENDED بعد از فعال‌شدن)
  const canReview =
    !isSelf && !myReviewRow && !!myMentorship?.startedAt && (myMentorship.status === "ACTIVE" || myMentorship.status === "ENDED");

  return NextResponse.json({
    mentor: {
      ...toMentorCard(profile, s),
      bio: profile.bio,
      specialties: profile.specialties,
      completedPrograms: s?.completedPrograms ?? 0,
      lastActiveAt: profile.lastActiveAt,
      memberSince: profile.createdAt,
      // دسترس‌پذیری (lib/mentorAvailability.ts): پیامِ عدمِ حضور فقط تا روزِ بازگشت
      awayMessage: toMentorCard(profile, s).awayUntil ? profile.awayMessage : null,
      intakeQuestions: profile.intakeQuestions,
    },
    reviews: reviews.map(toReview),
    myMentorship: myMentorship ? { id: myMentorship.id, status: myMentorship.status, initiatedBy: myMentorship.initiatedBy } : null,
    canReview,
    myReview: myReviewRow ? toReview(myReviewRow) : null,
    // نشانکِ «ذخیره‌شده‌ها» (lib/savedMentors.ts)
    saved,
    // صفِ انتظار (lib/mentorWaitlistServer.ts): وضعیتِ من + تعدادِ منتظرها
    waitlist: myWaitlist,
    waitlistCount,
  });
}
