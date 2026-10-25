import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound } from "@/lib/mentorGuard";
import { DISCOVERABLE_PROFILE_WHERE } from "@/lib/mentorServer";

// GET → { mentorId } فقط برای پروفایل منتشرشده، تاییدشده و غیرتعلیق؛ وگرنه 404
export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const u = typeof params.username === "string" ? params.username.trim() : "";
  if (!/^[A-Za-z0-9_.-]{2,40}$/.test(u)) return notFound();
  const p = await prisma.mentorProfile.findFirst({
    where: { ...DISCOVERABLE_PROFILE_WHERE, user: { username: { equals: u, mode: "insensitive" }, isBlocked: false, deletedAt: null } },
    select: { userId: true },
  });
  if (!p) return notFound();
  return NextResponse.json({ mentorId: p.userId });
}
