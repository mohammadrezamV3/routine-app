import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, conflict, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { visibleToStudent } from "@/lib/mentorProgramState";
import { isUniqueViolation } from "@/lib/mentorServer";
import { sealReportedText, verifyMessageReport, type MessageReportEvidence } from "@/lib/e2ee/reportServer";

const TARGETS = ["USER", "REVIEW", "MESSAGE", "PROGRAM"] as const;
type Target = (typeof TARGETS)[number];
const REASON_MAX = 200;
const DETAILS_MAX = 2000;

/**
 * صاحب محتوای گزارش‌شده، *فقط اگه* گزارش‌دهنده دسترسی مشروع به اون هدف
 * داشته باشه؛ وگرنه null (→ ۴۰۴). بدون این، این روت یک اوراکل می‌شد برای
 * حدس‌زدن وجود پیام/برنامه‌ی دیگران، و هرکسی می‌تونست هر idای رو گزارش کنه.
 */
async function resolveTargetOwner(type: Target, targetId: string, me: string): Promise<string | null> {
  switch (type) {
    case "USER": {
      if (targetId === me) return null;
      // طرف یک رابطه‌ی منتوری با من، یا منتوری که پروفایلش عمومی منتشر شده
      const related = await prisma.mentorship.findFirst({
        where: { OR: [{ mentorId: me, studentId: targetId }, { mentorId: targetId, studentId: me }] },
        select: { id: true },
      });
      if (related) return targetId;
      const publicMentor = await prisma.mentorProfile.findFirst({ where: { userId: targetId, published: true }, select: { id: true } });
      return publicMentor ? targetId : null;
    }
    case "REVIEW": {
      // نظرهای عمومی (VISIBLE) رو هرکسی می‌بینه؛ منتور نظرهای درباره‌ی خودش رو هم
      const r = await prisma.mentorReview.findFirst({
        where: { id: targetId, OR: [{ status: "VISIBLE" }, { mentorId: me }] },
        select: { studentId: true },
      });
      return r && r.studentId !== me ? r.studentId : null;
    }
    case "MESSAGE": {
      const msg = await prisma.mentorMessage.findFirst({
        where: { id: targetId, senderId: { not: me }, mentorship: { OR: [{ mentorId: me }, { studentId: me }] } },
        select: { senderId: true },
      });
      return msg?.senderId ?? null;
    }
    case "PROGRAM": {
      // فقط شاگرد برنامه‌ی منتورش رو گزارش می‌کنه (منتور صاحب برنامه‌ی خودشه)
      const p = await prisma.mentorProgram.findFirst({ where: { id: targetId, studentId: me }, select: { mentorId: true, status: true, sentAt: true } });
      return p && visibleToStudent(p) ? p.mentorId : null;
    }
  }
}

// POST /api/mentor-reports { targetType, targetId, reason, details?, franking? }
// برای MESSAGE: franking = { text, frankingKey } از کلاینت گیرنده (docs/mentor-e2ee.md).
// سرور تعهد رمزنگاری فرستنده را چک می‌کند و فقط متن همین یک پیام را (رمزشده
// در حال سکون) در گزارش نگه می‌دارد؛ ادمین هیچ پیام دیگری را نمی‌بیند.
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  if (!(await checkRateLimit(`mentor-report:${me}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد گزارش‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  if (!TARGETS.includes(b.targetType)) return badRequest("نوع گزارش نامعتبره");
  const targetType = b.targetType as Target;
  if (typeof b.targetId !== "string" || !b.targetId || b.targetId.length > 64) return badRequest("هدف گزارش نامعتبره");
  if (typeof b.reason !== "string" || !b.reason.trim()) return badRequest("دلیل گزارش لازمه");
  const reason = b.reason.trim().slice(0, REASON_MAX);
  if (b.details !== undefined && b.details !== null && typeof b.details !== "string") return badRequest("توضیحات نامعتبره");
  const details = typeof b.details === "string" ? b.details.trim().slice(0, DETAILS_MAX) || null : null;

  const targetUserId = await resolveTargetOwner(targetType, b.targetId, me);
  if (!targetUserId) return notFound();

  let evidence: MessageReportEvidence | null = null;
  if (targetType === "MESSAGE") {
    const v = await verifyMessageReport(b.targetId, me, b.franking);
    if (!v.ok) return badRequest(v.error);
    evidence = v.evidence;
  }

  try {
    const report = await prisma.mentorReport.create({
      data: {
        reporterId: me, targetType, targetId: b.targetId, targetUserId, reason, details,
        ...(evidence
          ? {
              reportedText: sealReportedText(evidence.reportedText, b.targetId, me),
              reportedMessageAt: evidence.reportedMessageAt,
              reportVerified: evidence.reportVerified,
            }
          : {}),
      },
      select: { id: true, targetType: true, targetId: true, status: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    if (isUniqueViolation(e)) return conflict("قبلا همین مورد رو گزارش دادی");
    throw e;
  }
}
