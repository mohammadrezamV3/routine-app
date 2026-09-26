import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { clampText } from "@/lib/validate";
import { recomputeMentorRating } from "@/lib/mentorServer";

// PATCH /api/admin/mentors/reviews/:id  بدنه { status: VISIBLE|HIDDEN, reason? }
// پنهان‌کردن دلیل لازم داره. بعد از هر تغییر خلاصه‌ی امتیازِ منتور بازمحاسبه می‌شه.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const body = await req.json().catch(() => null);
  const status = body?.status === "VISIBLE" || body?.status === "HIDDEN" ? (body.status as "VISIBLE" | "HIDDEN") : null;
  if (!status) return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
  const reason = typeof body.reason === "string" ? clampText(body.reason.trim(), 500) : "";
  if (status === "HIDDEN" && !reason) return NextResponse.json({ error: "برای پنهان‌کردن، نوشتنِ دلیل الزامیه" }, { status: 400 });

  const review = await prisma.mentorReview.findUnique({ where: { id: params.id }, select: { id: true, mentorId: true, status: true } });
  if (!review) return NextResponse.json({ error: "نظر پیدا نشد" }, { status: 404 });
  if (review.status === status) return NextResponse.json({ error: "وضعیت همینه؛ تغییری لازم نیست" }, { status: 409 });

  const changed = await prisma.$transaction(async (tx) => {
    const r = await tx.mentorReview.updateMany({
      where: { id: review.id, status: review.status },
      data: { status, hiddenReason: status === "HIDDEN" ? reason : null },
    });
    if (r.count === 0) return false;
    await tx.auditLog.create({
      data: {
        actorUserId: g.userId,
        action: status === "HIDDEN" ? "mentor.review_hide" : "mentor.review_restore",
        targetType: "MentorReview",
        targetId: review.id,
        meta: { mentorUserId: review.mentorId, ...(reason ? { reason } : {}) },
      },
    });
    return true;
  });
  if (!changed) return NextResponse.json({ error: "وضعیت همزمان تغییر کرده؛ صفحه رو تازه کن" }, { status: 409 });

  await recomputeMentorRating(review.mentorId);
  return NextResponse.json({ ok: true });
}
