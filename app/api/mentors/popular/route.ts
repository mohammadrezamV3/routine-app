import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { rankByPopularity } from "@/lib/mentorRanking";
import { DISCOVERABLE_PROFILE_WHERE, MENTOR_CARD_INCLUDE, blockedUserIds, loadMentorStats, toMentorCard } from "@/lib/mentorServer";

const TOP_N = 12;
const CANDIDATES = 500;

// GET /api/mentors/popular → منتورهای محبوب با امتیازِ ترکیبیِ lib/mentorRanking.ts
// (نه صرفاً تعدادِ شاگرد). فقط کسایی که شاگرد می‌پذیرن — ویترینِ «محبوب‌ها»
// نباید کاربر رو به منتوری بفرسته که درخواستش رو اصلا قبول نمی‌کنه.
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;

  const blocked = await blockedUserIds(g.userId);
  const candidates = await prisma.mentorProfile.findMany({
    where: {
      ...DISCOVERABLE_PROFILE_WHERE,
      acceptingStudents: true,
      ...(blocked.length ? { userId: { notIn: blocked } } : {}),
    },
    include: MENTOR_CARD_INCLUDE,
    orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: CANDIDATES,
  });
  const stats = await loadMentorStats(candidates.map((c) => c.userId));
  const ranked = rankByPopularity(candidates, (c) => {
    const s = stats.get(c.userId);
    return {
      ratingAvg: c.ratingAvg,
      ratingCount: c.ratingCount,
      activeStudents: s?.activeStudents ?? 0,
      totalStudents: s?.totalStudents ?? 0,
      completedPrograms: s?.completedPrograms ?? 0,
      lastActiveAt: c.lastActiveAt,
    };
  }).slice(0, TOP_N);

  return NextResponse.json({ mentors: ranked.map((p) => toMentorCard(p, stats.get(p.userId))) });
}
