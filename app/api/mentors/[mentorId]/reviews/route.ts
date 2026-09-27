import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, forbidden, conflict, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { recomputeMentorRating, isUniqueViolation } from "@/lib/mentorServer";
import { displayName } from "@/lib/inAppNotify";

const REVIEW_BODY_MAX = 1000;

type Ctx = { params: { mentorId: string } };

function validId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

async function parseReview(req: Request): Promise<{ ok: true; rating: number; body: string | null } | { ok: false; response: NextResponse }> {
  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return { ok: false, response: NextResponse.json({ error: parsed.error }, { status: parsed.status }) };
  const b = parsed.body || {};
  const rating = b.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, response: badRequest("امتیاز باید عددی بین ۱ تا ۵ باشه") };
  }
  if (b.body !== undefined && b.body !== null && typeof b.body !== "string") return { ok: false, response: badRequest("متن نظر نامعتبره") };
  const body = typeof b.body === "string" ? b.body.trim().slice(0, REVIEW_BODY_MAX) || null : null;
  return { ok: true, rating, body };
}

const REVIEW_SELECT = {
  id: true,
  rating: true,
  body: true,
  createdAt: true,
  student: { select: { name: true, lastName: true, username: true, avatarUrl: true } },
} as const;

function toReview(r: { id: string; rating: number; body: string | null; createdAt: Date; student: { name: string | null; lastName: string | null; username: string | null; avatarUrl: string | null } }) {
  return { id: r.id, rating: r.rating, body: r.body, createdAt: r.createdAt, student: { name: displayName(r.student), avatarUrl: r.student.avatarUrl } };
}

// POST /api/mentors/:mentorId/reviews → ثبتِ نظر (یکی به‌ازای هر شاگرد/منتور).
// فقط شاگردی که رابطه‌اش واقعاً شروع شده — وگرنه هرکسی می‌تونست بدونِ
// تجربه‌ی واقعی امتیازِ یک منتور رو بالا/پایین ببره.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!validId(params.mentorId) || params.mentorId === me) return notFound();

  if (!(await checkRateLimit(`mentor-review:${me}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const input = await parseReview(req);
  if (!input.ok) return input.response;

  const mentorship = await prisma.mentorship.findFirst({
    where: { mentorId: params.mentorId, studentId: me, startedAt: { not: null }, status: { in: ["ACTIVE", "ENDED"] } },
    select: { id: true },
  });
  if (!mentorship) return forbidden("فقط شاگردهای این منتور می‌تونن نظر بدن");

  let review;
  try {
    review = await prisma.mentorReview.create({
      data: { mentorId: params.mentorId, studentId: me, mentorshipId: mentorship.id, rating: input.rating, body: input.body },
      select: REVIEW_SELECT,
    });
  } catch (e) {
    if (isUniqueViolation(e)) return conflict("قبلا برای این منتور نظر ثبت کردی");
    throw e;
  }
  await recomputeMentorRating(params.mentorId);
  return NextResponse.json({ review: toReview(review) });
}

// PUT /api/mentors/:mentorId/reviews → ویرایشِ نظرِ خودم. نظرِ پنهان‌شده توسطِ
// ادمین با ویرایش دوباره نمایان نمی‌شه (status دست نمی‌خوره).
export async function PUT(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!validId(params.mentorId)) return notFound();

  const input = await parseReview(req);
  if (!input.ok) return input.response;

  const res = await prisma.mentorReview.updateMany({
    where: { mentorId: params.mentorId, studentId: me },
    data: { rating: input.rating, body: input.body },
  });
  if (res.count === 0) return notFound();
  await recomputeMentorRating(params.mentorId);
  const review = await prisma.mentorReview.findUnique({ where: { mentorId_studentId: { mentorId: params.mentorId, studentId: me } }, select: REVIEW_SELECT });
  return NextResponse.json({ review: review ? toReview(review) : null });
}

// DELETE /api/mentors/:mentorId/reviews → حذفِ نظرِ خودم
export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!validId(params.mentorId)) return notFound();

  const res = await prisma.mentorReview.deleteMany({ where: { mentorId: params.mentorId, studentId: g.userId } });
  if (res.count === 0) return notFound();
  await recomputeMentorRating(params.mentorId);
  return NextResponse.json({ ok: true });
}
