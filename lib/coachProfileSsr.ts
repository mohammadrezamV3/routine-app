import "server-only";
import { prisma } from "@/lib/prisma";
import { NAME_STYLE_SELECT, nameFlags } from "@/lib/nameStyle";
import { DISCOVERABLE_PROFILE_WHERE, MENTOR_CARD_INCLUDE, loadMentorStats, toMentorCard } from "@/lib/mentorServer";
import { displayName } from "@/lib/inAppNotify";
import { countWaiting } from "@/lib/mentorWaitlistServer";
import type { MentorProfileResponse } from "@/lib/mentorTypes";

// صفحه‌ی عمومی مربی (/c/[username]) برای مهمان و سئو: همان شکل GET /api/mentors/[mentorId]
// بدون هیچ چیز شخصی (رابطه، نظر من، نشانک، صف). فقط مربی منتشرشده، تاییدشده و غیرمعلق.
// کاربر واردشده داده‌ی شخصی رو بعدا از خود API می‌گیره.

const REVIEWS_LIMIT = 30;
const USERNAME_RE = /^[A-Za-z0-9_.-]{2,40}$/;

export type PublicCoach = { username: string; data: MentorProfileResponse };

export async function loadPublicCoach(rawUsername: string): Promise<PublicCoach | null> {
  const u = typeof rawUsername === "string" ? rawUsername.trim() : "";
  if (!USERNAME_RE.test(u)) return null;
  const profile = await prisma.mentorProfile.findFirst({
    where: { ...DISCOVERABLE_PROFILE_WHERE, user: { username: { equals: u, mode: "insensitive" }, isBlocked: false, deletedAt: null } },
    include: { ...MENTOR_CARD_INCLUDE, user: { select: { ...MENTOR_CARD_INCLUDE.user.select, createdAt: true } } },
  });
  if (!profile) return null;
  const mentorId = profile.userId;
  const [stats, reviews, waiting] = await Promise.all([
    loadMentorStats([mentorId]),
    prisma.mentorReview.findMany({
      where: { mentorId, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: REVIEWS_LIMIT,
      select: { id: true, rating: true, body: true, createdAt: true, student: { select: { name: true, lastName: true, username: true, avatarUrl: true, ...NAME_STYLE_SELECT } } },
    }),
    countWaiting(mentorId),
  ]);
  const s = stats.get(mentorId);
  const card = toMentorCard(profile, s);
  const data: MentorProfileResponse = {
    mentor: {
      ...card,
      bio: profile.bio,
      specialties: profile.specialties,
      completedPrograms: s?.completedPrograms ?? 0,
      lastActiveAt: profile.lastActiveAt ? profile.lastActiveAt.toISOString() : null,
      awayMessage: card.awayUntil ? profile.awayMessage : null,
      intakeQuestions: profile.intakeQuestions,
    },
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      student: { name: displayName(r.student), avatarUrl: r.student.avatarUrl, ...nameFlags(r.student) },
    })),
    myMentorship: null,
    canReview: false,
    myReview: null,
    saved: false,
    waitlist: null,
    waitlistCount: waiting,
  };
  return { username: profile.user.username ?? u, data };
}
