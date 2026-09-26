import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, conflict, badRequest, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { PUBLIC_USER_SELECT, toFeedbackRow } from "@/lib/mentorServer";

type Ctx = { params: { id: string } };
const BODY_MAX = 2000;

function optId(v: unknown): string | null | "bad" {
  if (v === undefined || v === null || v === "") return null;
  return typeof v === "string" && v.length <= 64 ? v : "bad";
}

// POST /api/mentor-programs/:id/feedback { body, itemId?, logId? } → فقط منتورِ
// همین برنامه، برنامه‌ی غیرِ DRAFT. آیتم/لاگ باید مالِ همین برنامه باشن تا
// فیدبک به داده‌ی برنامه‌ی دیگه‌ای (یا منتورِ دیگه‌ای) وصل نشه.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (typeof params.id !== "string" || !params.id || params.id.length > 64) return notFound();

  const p = await prisma.mentorProgram.findFirst({
    where: { id: params.id, mentorId: me },
    select: { id: true, title: true, status: true, studentId: true, mentorship: { select: { status: true } } },
  });
  if (!p) return notFound();
  if (p.status === "DRAFT") return conflict("برای پیش‌نویس نمی‌شه فیدبک فرستاد");
  // بعد از پایان/بلاکِ رابطه، منتور دیگه راهی برای رسیدن به شاگرد نداره
  if (p.mentorship.status !== "ACTIVE") return conflict("رابطه با این شاگرد فعال نیست");

  if (!(await checkRateLimit(`mentor-feedback:${me}`, 60, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد فیدبک‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (typeof b.body !== "string" || !b.body.trim()) return badRequest("متن فیدبک لازمه");
  const body = b.body.trim().slice(0, BODY_MAX);

  let itemId = optId(b.itemId);
  const logId = optId(b.logId);
  if (itemId === "bad" || logId === "bad") return badRequest("آیتم یا لاگ نامعتبره");

  if (logId) {
    const log = await prisma.mentorProgramLog.findFirst({ where: { id: logId, programId: p.id }, select: { itemId: true } });
    if (!log) return notFound();
    if (itemId && itemId !== log.itemId) return badRequest("لاگ متعلق به این آیتم نیست");
    itemId = log.itemId;
  } else if (itemId) {
    const item = await prisma.mentorProgramItem.findFirst({ where: { id: itemId, programId: p.id }, select: { id: true } });
    if (!item) return notFound();
  }

  const fb = await prisma.mentorFeedback.create({
    data: { programId: p.id, itemId, logId, mentorId: me, studentId: p.studentId, body },
    include: { item: { select: { title: true } } },
  });
  touchMentorActivity(me);

  const mentor = await prisma.user.findUnique({ where: { id: me }, select: PUBLIC_USER_SELECT });
  await notifyUser(p.studentId, {
    type: "program.feedback",
    title: "فیدبک جدید از منتور",
    body: `${displayName(mentor)} درباره‌ی «${p.title}»: ${body.slice(0, 120)}`,
    url: `/mentor-programs/${p.id}`,
  });

  return NextResponse.json({ feedback: toFeedbackRow(fb) });
}
