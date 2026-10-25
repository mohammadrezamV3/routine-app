import { NextResponse } from "next/server";
import { requireMentorsUser, notFound } from "@/lib/mentorGuard";
import { buildCoachSpace } from "@/lib/coachSpaceServer";

export const dynamic = "force-dynamic";

// GET → CoachSpace (404 اگه کاربر طرف این همکاری نباشه)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const space = await buildCoachSpace(params.id, g.userId);
  if (!space) return notFound();
  return NextResponse.json(space);
}
