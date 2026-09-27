import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, conflict, forbidden } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { isUniqueViolation } from "@/lib/mentorServer";
import { LABELS_MAX, validateLabelName } from "@/lib/mentorAvailability";
import { readLabels } from "@/lib/mentorManageServer";
import { faNum } from "@/lib/jalali";

// برچسب‌های خصوصیِ منتور برای دسته‌بندیِ شاگردها — فقط خودِ منتور می‌بیند.

async function myProfileId(userId: string): Promise<string | null> {
  const p = await prisma.mentorProfile.findUnique({ where: { userId }, select: { id: true } });
  return p?.id ?? null;
}

// GET /api/mentor/labels → { labels }
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const profileId = await myProfileId(g.userId);
  if (!profileId) return forbidden("اول پروفایل منتوری بساز");
  return NextResponse.json({ labels: await readLabels(profileId) });
}

// POST /api/mentor/labels { name } → { label, labels }
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const profileId = await myProfileId(g.userId);
  if (!profileId) return forbidden("اول پروفایل منتوری بساز");

  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const v = validateLabelName(parsed.body?.name);
  if (!v.ok) return badRequest(v.error);

  const count = await prisma.mentorStudentLabel.count({ where: { profileId } });
  if (count >= LABELS_MAX) return conflict(`حداکثر ${faNum(LABELS_MAX)} برچسب`);
  try {
    const label = await prisma.mentorStudentLabel.create({ data: { profileId, name: v.data }, select: { id: true, name: true } });
    return NextResponse.json({ label, labels: await readLabels(profileId) });
  } catch (e) {
    if (isUniqueViolation(e)) return conflict("برچسبی با این نام داری");
    throw e;
  }
}
