import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getMentorshipForUser, notFound, conflict, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { isUniqueViolation } from "@/lib/mentorServer";
import { clearedBeforeFor } from "@/lib/mentorChatHistory";
import { sealReportMessage, verifyConversationMessages } from "@/lib/mentorConversationReport";

type Ctx = { params: { id: string } };
const REASON_MAX = 200;
const DETAILS_MAX = 2000;

// POST /api/mentorships/:id/report { reason, details?, messages: [{ id, text, frankingKey }] }
// «گزارش گفت‌وگو»: هر پیامِ پیوست جداگانه با فرانکینگ تایید می‌شود
// (lib/mentorConversationReport.ts). یکی نخواند = کلِ گزارش رد. ادمین فقط همین
// پیام‌ها را می‌بیند؛ متنشان رمزشده در حالِ سکون در MentorReportMessage می‌ماند.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const m = await getMentorshipForUser(params.id, me);
  if (!m) return notFound();

  // همان سقفِ گزارشِ تکی (مشترک)
  if (!(await checkRateLimit(`mentor-report:${me}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد گزارش‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const parsed = await readJsonBody(req, 256 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (typeof b.reason !== "string" || !b.reason.trim()) return badRequest("دلیل گزارش لازمه");
  const reason = b.reason.trim().slice(0, REASON_MAX);
  if (b.details !== undefined && b.details !== null && typeof b.details !== "string") return badRequest("توضیحات نامعتبره");
  const details = typeof b.details === "string" ? b.details.trim().slice(0, DETAILS_MAX) || null : null;

  const v = await verifyConversationMessages(m.id, b.messages, clearedBeforeFor(m, me));
  if (!v.ok) return NextResponse.json({ error: v.error, messageId: v.messageId }, { status: 400 });

  const counterpart = m.mentorId === me ? m.studentId : m.mentorId;
  if (!v.messages.some((x) => x.senderId === counterpart)) return badRequest("حداقل یک پیام از طرف مقابل انتخاب کن");

  try {
    const report = await prisma.$transaction(async (tx) => {
      const r = await tx.mentorReport.create({
        data: {
          reporterId: me, targetType: "CONVERSATION", targetId: m.id, targetUserId: counterpart, reason, details,
          reportVerified: v.messages.every((x) => x.verified),
        },
        select: { id: true, targetType: true, targetId: true, status: true, createdAt: true },
      });
      await tx.mentorReportMessage.createMany({
        data: v.messages.map((x, i) => ({
          reportId: r.id,
          messageId: x.messageId,
          senderId: x.senderId,
          text: sealReportMessage(x.text, r.id, x.messageId),
          messageAt: x.messageAt,
          verified: x.verified,
          position: i,
        })),
      });
      return r;
    });
    return NextResponse.json({ ok: true, report, messages: v.messages.length });
  } catch (e) {
    if (isUniqueViolation(e)) return conflict("این گفت‌وگو را قبلا گزارش داده‌ای");
    throw e;
  }
}
