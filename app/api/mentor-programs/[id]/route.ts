import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorProfile, notFound, conflict, badRequest, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody, parseDateRange } from "@/lib/validate";
import { visibleToStudent } from "@/lib/mentorProgramState";
import { validateProgramInput } from "@/lib/mentorValidate";
import {
  PROGRAM_WITH_USERS_INCLUDE,
  serializeProgram,
  serializeItem,
  serializeLog,
  toFeedbackRow,
  loadProgramWithUsers,
  todayIsoForUser,
} from "@/lib/mentorServer";
import { activateDuePrograms } from "@/lib/mentorProgramMirror";

type Ctx = { params: { id: string } };
const MAX_LOGS = 1000;
const MAX_FEEDBACK = 200;
const MAX_LOG_RANGE_DAYS = 120;

function validId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

/** برنامه‌ای که من منتور یا شاگردشم؛ پیش‌نویسِ هرگز-ارسال‌نشده برای شاگرد ۴۰۴ */
async function loadVisibleProgram(id: string, me: string) {
  const p = await prisma.mentorProgram.findFirst({ where: { id, OR: [{ mentorId: me }, { studentId: me }] }, include: PROGRAM_WITH_USERS_INCLUDE });
  if (!p) return null;
  if (p.mentorId !== me && !visibleToStudent(p)) return null;
  return p;
}

// GET /api/mentor-programs/:id?from=&to= → برنامه + آیتم‌ها + لاگ‌ها + فیدبک.
// منتور فقط برنامه‌های *خودش* رو می‌بینه (mentorId در where) — منتورِ دیگه هرگز.
export async function GET(req: NextRequest, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!validId(params.id)) return notFound();

  let p = await loadVisibleProgram(params.id, me);
  if (!p) return notFound();

  if (p.status === "ACCEPTED") {
    const activated = await activateDuePrograms([p], todayIsoForUser);
    if (activated.length > 0) p = (await loadVisibleProgram(params.id, me))!;
  }

  const sp = req.nextUrl.searchParams;
  let dateWhere = {};
  if (sp.get("from") || sp.get("to")) {
    const r = parseDateRange(sp.get("from"), sp.get("to"), MAX_LOG_RANGE_DAYS);
    if ("error" in r) return badRequest(r.error);
    dateWhere = { date: { gte: r.from, lte: r.to } };
  }

  const [items, logs, feedback] = await Promise.all([
    prisma.mentorProgramItem.findMany({ where: { programId: p.id }, orderBy: { order: "asc" } }),
    prisma.mentorProgramLog.findMany({ where: { programId: p.id, ...dateWhere }, orderBy: { date: "desc" }, take: MAX_LOGS }),
    prisma.mentorFeedback.findMany({
      where: { programId: p.id },
      orderBy: { createdAt: "desc" },
      take: MAX_FEEDBACK,
      include: { item: { select: { title: true } } },
    }),
  ]);

  return NextResponse.json({
    program: await serializeProgram(p, me),
    role: p.mentorId === me ? "MENTOR" : "STUDENT",
    items: items.map(serializeItem),
    logs: logs.map(serializeLog),
    feedback: feedback.map(toFeedbackRow),
  });
}

// PUT /api/mentor-programs/:id → ویرایشِ پیش‌نویس (فقط منتور، فقط DRAFT). آیتم‌ها کامل جایگزین می‌شن.
export async function PUT(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!validId(params.id)) return notFound();

  const mp = await getActiveMentorProfile(me);
  if (!mp.ok) return mp.response;

  const current = await prisma.mentorProgram.findFirst({ where: { id: params.id, mentorId: me }, select: { id: true, type: true, status: true } });
  if (!current) return notFound();
  if (current.status !== "DRAFT") return conflict("فقط پیش‌نویس قابل ویرایشه");

  const parsed = await readJsonBody(req, 128 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const v = validateProgramInput(parsed.body, current.type);
  if (!v.ok) return badRequest(v.error);
  const { items, ...fields } = v.data;

  const ok = await prisma.$transaction(async (tx) => {
    // قفلِ خوش‌بینانه: اگه هم‌زمان ارسال شده باشه (دیگه DRAFT نیست) هیچ‌چیز نوشته نمی‌شه
    const res = await tx.mentorProgram.updateMany({ where: { id: current.id, mentorId: me, status: "DRAFT" }, data: fields });
    if (res.count === 0) return false;
    await tx.mentorProgramItem.deleteMany({ where: { programId: current.id } });
    if (items.length > 0) await tx.mentorProgramItem.createMany({ data: items.map((it) => ({ ...it, programId: current.id })) });
    return true;
  });
  if (!ok) return conflict("این برنامه هم‌زمان تغییر کرد؛ دیگه پیش‌نویس نیست");
  touchMentorActivity(me);

  const program = await loadProgramWithUsers(current.id);
  return NextResponse.json({ program: await serializeProgram(program!, me) });
}

// DELETE /api/mentor-programs/:id → فقط پیش‌نویسی که هرگز برای شاگرد ارسال نشده
// (برنامه‌ای که شاگرد دیده، با «لغو» بسته می‌شه نه حذف، تا تاریخچه بمونه).
export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!validId(params.id)) return notFound();

  const res = await prisma.mentorProgram.deleteMany({ where: { id: params.id, mentorId: me, status: "DRAFT", sentAt: null } });
  if (res.count === 0) {
    const exists = await prisma.mentorProgram.findFirst({ where: { id: params.id, mentorId: me }, select: { id: true } });
    return exists ? conflict("فقط پیش‌نویسی که هنوز ارسال نشده قابل حذفه") : notFound();
  }
  return NextResponse.json({ ok: true });
}
