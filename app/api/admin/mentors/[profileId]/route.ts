import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, loadTarget } from "@/lib/adminUsers";

// GET /api/admin/mentors/:profileId — پروفایل + مدارک (فقط متا، هرگز بایت) +
// تاریخچه‌ی احراز + آمار + گزارش‌های بازِ علیهِ همین کاربر.
export async function GET(_req: NextRequest, { params }: { params: { profileId: string } }) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const profile = await prisma.mentorProfile.findUnique({
    where: { id: params.profileId },
    select: {
      id: true, userId: true, headline: true, bio: true, specialties: true, categories: true,
      published: true, acceptingStudents: true,
      identityStatus: true, identityRejectReason: true, identityReviewedAt: true,
      suspendedAt: true, suspendedReason: true, ratingAvg: true, ratingCount: true,
      lastActiveAt: true, createdAt: true, updatedAt: true,
      user: {
        select: { id: true, name: true, lastName: true, username: true, avatarUrl: true, isBlocked: true, deletedAt: true, createdAt: true },
      },
      credentials: {
        orderBy: { category: "asc" },
        select: { id: true, category: true, status: true, rejectReason: true, reviewedAt: true, updatedAt: true },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, kind: true, category: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
      },
      verificationEvents: {
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, kind: true, category: true, fromStatus: true, toStatus: true, reason: true, actorUserId: true, createdAt: true },
      },
    },
  });
  if (!profile) return NextResponse.json({ error: "منتور پیدا نشد" }, { status: 404 });
  // ادمینِ محدود جزئیات/تاریخچه‌ی احرازِ Owner (یا ادمینِ دیگه بدونِ admins.manage) رو نمی‌بینه
  try {
    await loadTarget(g, profile.userId);
  } catch (e) {
    return adminErrorResponse(e);
  }

  const mentorId = profile.userId;
  const [activeStudents, totalStudents, programs, completedPrograms, hiddenReviews, openReports] = await Promise.all([
    prisma.mentorship.count({ where: { mentorId, status: "ACTIVE" } }),
    prisma.mentorship.count({ where: { mentorId, startedAt: { not: null } } }),
    prisma.mentorProgram.count({ where: { mentorId, status: { not: "DRAFT" } } }),
    prisma.mentorProgram.count({ where: { mentorId, status: "COMPLETED" } }),
    prisma.mentorReview.count({ where: { mentorId, status: "HIDDEN" } }),
    prisma.mentorReport.findMany({
      where: { targetUserId: mentorId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, targetType: true, reason: true, details: true, createdAt: true },
    }),
  ]);

  const actorIds = Array.from(new Set(profile.verificationEvents.map((e) => e.actorUserId)));
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, lastName: true, username: true } })
    : [];
  const actorBy = new Map(actors.map((a) => [a.id, a]));

  return NextResponse.json({
    profile: {
      ...profile,
      identityReviewedAt: profile.identityReviewedAt?.toISOString() ?? null,
      suspendedAt: profile.suspendedAt?.toISOString() ?? null,
      lastActiveAt: profile.lastActiveAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      user: {
        ...profile.user,
        deletedAt: profile.user.deletedAt?.toISOString() ?? null,
        createdAt: profile.user.createdAt.toISOString(),
      },
      credentials: profile.credentials.map((c) => ({
        ...c,
        reviewedAt: c.reviewedAt?.toISOString() ?? null,
        updatedAt: c.updatedAt.toISOString(),
      })),
      documents: profile.documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
      verificationEvents: undefined,
    },
    events: profile.verificationEvents.map((e) => {
      const a = actorBy.get(e.actorUserId);
      return {
        id: e.id, kind: e.kind, category: e.category, fromStatus: e.fromStatus, toStatus: e.toStatus, reason: e.reason,
        byMentor: e.actorUserId === mentorId,
        actor: a ? { name: a.name, lastName: a.lastName, username: a.username } : null,
        createdAt: e.createdAt.toISOString(),
      };
    }),
    stats: {
      activeStudents, totalStudents, programs, completedPrograms,
      ratingAvg: profile.ratingAvg, ratingCount: profile.ratingCount, hiddenReviews,
    },
    openReports: openReports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
}
