import { describe, it, expect, afterAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

import { prisma } from "@/lib/prisma";
import { GET as listPrograms, POST as postProgram } from "@/app/api/mentor-programs/route";
import { GET as getProgram, PUT as putProgram, DELETE as deleteProgram } from "@/app/api/mentor-programs/[id]/route";
import { POST as postLog } from "@/app/api/mentor-programs/[id]/logs/route";
import { POST as postFeedback } from "@/app/api/mentor-programs/[id]/feedback/route";
import { POST as readFeedback } from "@/app/api/mentor-programs/[id]/feedback/read/route";
import {
  as,
  req,
  j,
  makeUser,
  makeMentor,
  cleanupUsers,
  connect,
  requestMentorship,
  createProgram,
  createProgramId,
  activeProgram,
  transition,
  programBody,
  readOccurrences,
  today,
  dayOffset,
  jsDayOf,
} from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const p = (id: string) => ({ params: { id } });

async function getP(userId: string | null, id: string, qs = "") {
  as(userId);
  return getProgram(req("GET", `/api/mentor-programs/${id}${qs}`), p(id));
}
async function list(userId: string, qs: string) {
  as(userId);
  return j(await listPrograms(req("GET", `/api/mentor-programs${qs}`)));
}
async function log(userId: string, id: string, body: Record<string, unknown>) {
  as(userId);
  return postLog(req("POST", `/api/mentor-programs/${id}/logs`, body), p(id));
}
async function feedback(userId: string, id: string, body: Record<string, unknown>) {
  as(userId);
  return postFeedback(req("POST", `/api/mentor-programs/${id}/feedback`, body), p(id));
}
async function items(userId: string, id: string): Promise<any[]> {
  return (await j(await getP(userId, id))).items;
}

async function pair() {
  const m = await makeMentor();
  const s = await makeUser();
  const ms = await connect(s, m);
  return { m, s, ms };
}

describe("برنامه — ساخت", () => {
  it("ناشناس ۴۰۱", async () => {
    as(null);
    expect((await postProgram(req("POST", "/api/mentor-programs", programBody("x")))).status).toBe(401);
    expect((await listPrograms(req("GET", "/api/mentor-programs"))).status).toBe(401);
  });

  it("منتور روی رابطه‌ی ACTIVEِ خودش DRAFT می‌سازد؛ mass assignment بی‌اثر", async () => {
    const { m, s, ms } = await pair();
    const r = await createProgram(m, ms, { status: "ACTIVE", version: 9, studentId: "evil", sentAt: new Date().toISOString() });
    expect(r.status).toBe(200);
    const prog = (await j(r)).program;
    expect(prog.status).toBe("DRAFT");
    expect(prog.version).toBe(1);
    expect(prog.sentAt).toBeNull();
    expect(prog.counterpart.id).toBe(s);
    const row = await prisma.mentorProgram.findUnique({ where: { id: prog.id } });
    expect(row!.studentId).toBe(s);
    expect(row!.mentorId).toBe(m);
  });

  it("شاگرد (بدونِ پروفایل منتوری) نمی‌تواند بسازد ۴۰۳؛ منتورِ دیگر روی رابطه‌ی غیرِ خودش ۴۰۴", async () => {
    const { s, ms } = await pair();
    expect((await createProgram(s, ms)).status).toBe(403);
    const other = await makeMentor();
    expect((await createProgram(other, ms)).status).toBe(404);
  });

  it("رابطه‌ی PENDING → ۴۰۹؛ بدنه‌ی نامعتبر ۴۰۰", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const pending = (await j(await requestMentorship(s, m))).mentorship.id;
    expect((await createProgram(m, pending)).status).toBe(409);
    const { m: m2, ms } = await pair();
    expect((await createProgram(m2, ms, { type: "NUTRITION" })).status).toBe(400);
    expect((await createProgram(m2, ms, { title: "" })).status).toBe(400);
    expect((await createProgram(m2, ms, { items: [{ title: "x", repeat: "WEEKLY", days: [9] }] })).status).toBe(400);
    expect((await createProgram(m2, ms, { startDate: "2026-05-10", endDate: "2026-05-01" })).status).toBe(400);
  });
});

describe("برنامه — ماشینِ حالت", () => {
  it("send بدونِ آیتم ۴۰۰؛ شاگرد نمی‌تواند send کند؛ پیش‌نویسِ ارسال‌نشده برای شاگرد نامرئی", async () => {
    const { m, s, ms } = await pair();
    const empty = await createProgramId(m, ms, { items: [] });
    expect((await transition(m, empty, "send")).status).toBe(400);

    const draft = await createProgramId(m, ms);
    // نامرئی برای شاگرد: لیست، GET، transition، لاگ، read
    expect((await list(s, "?role=student")).programs.map((x: any) => x.id)).not.toContain(draft);
    expect((await getP(s, draft)).status).toBe(404);
    expect((await transition(s, draft, "send")).status).toBe(404);
    expect((await transition(s, draft, "cancel")).status).toBe(404);
    as(s);
    expect((await readFeedback(req("POST", "/x"), p(draft))).status).toBe(404);
    // منتور می‌بیند
    expect((await list(m, "?role=mentor")).programs.map((x: any) => x.id)).toContain(draft);
    expect((await getP(m, draft)).status).toBe(200);

    // بعد از send شاگرد می‌بیند و خودِ send برای شاگرد ممنوع
    expect((await transition(m, draft, "send")).status).toBe(200);
    expect((await list(s, "?role=student")).programs.map((x: any) => x.id)).toContain(draft);
    expect(await prisma.inAppNotification.count({ where: { userId: s, type: "program.new" } })).toBe(1);
  });

  it("منتور نمی‌تواند accept کند (۴۰۳)، شاگرد accept → ACTIVE (بدون startDate) + آینه در روتین", async () => {
    const { m, s, ms } = await pair();
    const id = await createProgramId(m, ms, { title: "روتین صبح" });
    expect((await transition(m, id, "send")).status).toBe(200);
    expect((await transition(m, id, "accept")).status).toBe(403);
    expect((await transition(m, id, "reject")).status).toBe(403);
    expect((await transition(m, id, "request_changes", "x")).status).toBe(403);
    const a = await transition(s, id, "accept");
    expect(a.status).toBe(200);
    const prog = (await j(a)).program;
    expect(prog.status).toBe("ACTIVE");
    expect(prog.activatedAt).toBeTruthy();
    const occ = await readOccurrences(s);
    const mine = occ.filter((o) => o.mentorProgramId === id);
    expect(mine).toHaveLength(7); // DAILY
    expect(mine[0].tag).toBe("روتین صبح");
    expect(mine[0].startDate).toBe(today());
    expect(await prisma.inAppNotification.count({ where: { userId: m, type: "program.accepted" } })).toBe(1);

    // PUT روی غیرِ DRAFT ممنوع
    as(m);
    expect((await putProgram(req("PUT", `/api/mentor-programs/${id}`, { title: "x", items: [] }), p(id))).status).toBe(409);
    // accept دوباره ۴۰۹
    expect((await transition(s, id, "accept")).status).toBe(409);
    // DELETE غیرِ پیش‌نویس ۴۰۹
    as(m);
    expect((await deleteProgram(req("DELETE", "/x"), p(id))).status).toBe(409);
  });

  it("accept با startDateِ گذشته → فوراً ACTIVE؛ با startDateِ آینده → ACCEPTED، بعد activate → ACTIVE", async () => {
    const { m, s, ms } = await pair();
    const past = await activeProgram(m, s, ms, { startDate: dayOffset(-3) });
    expect((await prisma.mentorProgram.findUnique({ where: { id: past } }))!.status).toBe("ACTIVE");

    const fut = await createProgramId(m, ms, { startDate: dayOffset(5) });
    expect((await transition(m, fut, "send")).status).toBe(200);
    const a = await transition(s, fut, "accept");
    expect((await j(a)).program.status).toBe("ACCEPTED");
    expect((await readOccurrences(s)).some((o) => o.mentorProgramId === fut)).toBe(false);
    // لاگ روی ACCEPTED ممنوع
    const it0 = (await items(s, fut))[0];
    expect((await log(s, fut, { itemId: it0.id, date: today(), status: "COMPLETED" })).status).toBe(409);
    // GET برنامه آن را زودتر از موعد فعال نمی‌کند
    expect((await j(await getP(s, fut))).program.status).toBe("ACCEPTED");

    const act = await transition(m, fut, "activate");
    expect(act.status).toBe(200);
    expect((await j(act)).program.status).toBe("ACTIVE");
    const occ = (await readOccurrences(s)).filter((o) => o.mentorProgramId === fut);
    expect(occ.length).toBeGreaterThan(0);
    expect(occ[0].startDate).toBe(dayOffset(5));
  });

  it("ACCEPTED با startDateِ رسیده، با GET به‌صورت lazy فعال می‌شود", async () => {
    const { m, s, ms } = await pair();
    const id = await createProgramId(m, ms, { startDate: dayOffset(2) });
    await transition(m, id, "send");
    await transition(s, id, "accept");
    await prisma.mentorProgram.update({ where: { id }, data: { startDate: new Date(dayOffset(0) + "T00:00:00.000Z") } });
    expect((await j(await getP(s, id))).program.status).toBe("ACTIVE");
  });

  it("reject با یادداشت → REJECTED + rejectReason؛ انتقال‌های بعدی ۴۰۹", async () => {
    const { m, s, ms } = await pair();
    const id = await createProgramId(m, ms);
    await transition(m, id, "send");
    const r = await transition(s, id, "reject", "زمانم نمی‌خونه");
    expect(r.status).toBe(200);
    const prog = (await j(r)).program;
    expect(prog.status).toBe("REJECTED");
    expect(prog.rejectReason).toBe("زمانم نمی‌خونه");
    expect((await transition(s, id, "accept")).status).toBe(409);
    expect((await transition(m, id, "cancel")).status).toBe(409);
    expect((await transition(m, id, "complete")).status).toBe(409);
    expect(await prisma.inAppNotification.count({ where: { userId: m, type: "program.rejected" } })).toBe(1);
  });

  it("request_changes: note لازم؛ → DRAFT (هنوز برای شاگرد مرئی) → ویرایش → ارسالِ دوباره نسخه‌ی ۲", async () => {
    const { m, s, ms } = await pair();
    const id = await createProgramId(m, ms);
    await transition(m, id, "send");
    expect((await transition(s, id, "request_changes")).status).toBe(400);
    expect((await transition(s, id, "request_changes", "   ")).status).toBe(400);
    const rc = await transition(s, id, "request_changes", "ساعت رو عوض کن");
    expect(rc.status).toBe(200);
    const prog = (await j(rc)).program;
    expect(prog.status).toBe("DRAFT");
    expect(prog.changeRequestNote).toBe("ساعت رو عوض کن");
    // هنوز برای شاگرد مرئی (sentAt دارد)، ولی DELETE ممنوع
    expect((await getP(s, id)).status).toBe(200);
    as(m);
    expect((await deleteProgram(req("DELETE", "/x"), p(id))).status).toBe(409);

    // شاگرد نمی‌تواند ویرایش کند
    as(s);
    expect((await putProgram(req("PUT", `/api/mentor-programs/${id}`, { title: "hack", items: [] }), p(id))).status).toBe(403);

    as(m);
    const put = await putProgram(
      req("PUT", `/api/mentor-programs/${id}`, { title: "نسخه جدید", items: [{ title: "مطالعه عصر", repeat: "WEEKLY", days: [1, 3], startTime: "18:00" }] }),
      p(id)
    );
    expect(put.status).toBe(200);
    expect((await j(put)).program.title).toBe("نسخه جدید");
    const its = await items(m, id);
    expect(its).toHaveLength(1);
    expect(its[0].title).toBe("مطالعه عصر");
    expect(its[0].days).toEqual([1, 3]);

    const resend = await transition(m, id, "send");
    expect(resend.status).toBe(200);
    const p2 = (await j(resend)).program;
    expect(p2.status).toBe("PENDING");
    expect(p2.version).toBe(2);
    expect(p2.changeRequestNote).toBeNull();
    expect(await prisma.inAppNotification.count({ where: { userId: s, type: "program.resent" } })).toBe(1);
    expect(await prisma.inAppNotification.count({ where: { userId: m, type: "program.changes_requested" } })).toBe(1);
  });

  it("complete و cancel آینه را حذف می‌کنند؛ هر دو طرف مجازند", async () => {
    const { m, s, ms } = await pair();
    const a = await activeProgram(m, s, ms, { title: "A" });
    const b = await activeProgram(m, s, ms, { title: "B" });
    const c = await transition(s, a, "complete");
    expect((await j(c)).program.status).toBe("COMPLETED");
    const x = await transition(m, b, "cancel");
    expect((await j(x)).program.status).toBe("CANCELLED");
    expect((await readOccurrences(s)).some((o) => o.mentorProgramId)).toBe(false);
    expect((await transition(m, a, "cancel")).status).toBe(409);
    expect((await transition(m, a, "activate")).status).toBe(409);
  });

  it("اقدامِ نامعتبر ۴۰۰؛ منتورِ دیگر ۴۰۴؛ send روی رابطه‌ی پایان‌یافته ۴۰۹", async () => {
    const { m, s, ms } = await pair();
    const id = await createProgramId(m, ms);
    expect((await transition(m, id, "constructor")).status).toBe(400);
    const other = await makeMentor();
    expect((await transition(other, id, "send")).status).toBe(404);
    expect((await getP(other, id)).status).toBe(404);
    as(other);
    expect((await putProgram(req("PUT", "/x", { title: "x", items: [] }), p(id))).status).toBe(404);
    expect((await deleteProgram(req("DELETE", "/x"), p(id))).status).toBe(404);

    await prisma.mentorship.update({ where: { id: ms }, data: { status: "ENDED" } });
    expect((await transition(m, id, "send")).status).toBe(409);
  });

  it("DELETE فقط پیش‌نویسِ ارسال‌نشده", async () => {
    const { m, ms } = await pair();
    const id = await createProgramId(m, ms);
    as(m);
    const d = await deleteProgram(req("DELETE", "/x"), p(id));
    expect(d.status).toBe(200);
    expect(await prisma.mentorProgram.count({ where: { id } })).toBe(0);
  });

  it("شاگردِ دیگر برنامه/لیستِ این شاگرد را نمی‌بیند", async () => {
    const { m, s, ms } = await pair();
    const id = await activeProgram(m, s, ms);
    const other = await makeUser();
    expect((await getP(other, id)).status).toBe(404);
    expect((await transition(other, id, "cancel")).status).toBe(404);
    expect((await list(other, "?role=student")).programs).toEqual([]);
    expect((await list(other, `?role=student&mentorshipId=${ms}`)).programs).toEqual([]);
    as(other);
    expect((await readFeedback(req("POST", "/x"), p(id))).status).toBe(404);
  });

  it("فیلترِ status در لیست؛ status نامعتبر ۴۰۰", async () => {
    const { m, s, ms } = await pair();
    const act = await activeProgram(m, s, ms);
    await createProgramId(m, ms);
    const r = await list(m, "?role=mentor&status=ACTIVE");
    expect(r.programs.map((x: any) => x.id)).toEqual([act]);
    as(m);
    expect((await listPrograms(req("GET", "/api/mentor-programs?status=BOGUS"))).status).toBe(400);
  });
});

describe("اجرا — لاگ‌ها", () => {
  it("upsert، آینده ممنوع، قبل از شروع ممنوع، آیتمِ برنامه‌ی دیگر ۴۰۴، منتور لاگ‌ها را می‌بیند", async () => {
    const { m, s, ms } = await pair();
    const id = await activeProgram(m, s, ms, { startDate: dayOffset(-3) });
    const other = await activeProgram(m, s, ms, { title: "دیگری" });
    const [item] = await items(s, id);
    const [foreignItem] = await items(s, other);

    const r1 = await log(s, id, { itemId: item.id, date: dayOffset(-1), status: "PARTIAL", note: "نصفه" });
    expect(r1.status).toBe(200);
    const l1 = (await j(r1)).log;
    expect(l1.status).toBe("PARTIAL");
    const r2 = await log(s, id, { itemId: item.id, date: dayOffset(-1), status: "COMPLETED" });
    const l2 = (await j(r2)).log;
    expect(l2.id).toBe(l1.id); // upsert
    expect(l2.status).toBe("COMPLETED");
    expect(await prisma.mentorProgramLog.count({ where: { programId: id } })).toBe(1);

    expect((await log(s, id, { itemId: item.id, date: dayOffset(1), status: "COMPLETED" })).status).toBe(400);
    expect((await log(s, id, { itemId: item.id, date: dayOffset(-10), status: "COMPLETED" })).status).toBe(400);
    expect((await log(s, id, { itemId: foreignItem.id, date: today(), status: "COMPLETED" })).status).toBe(404);
    expect((await log(s, id, { itemId: item.id, date: "2026/01/01", status: "COMPLETED" })).status).toBe(400);
    expect((await log(s, id, { itemId: item.id, date: today(), status: "DONE" })).status).toBe(400);
    expect((await log(s, id, { itemId: item.id, date: today(), status: "COMPLETED", setsDone: -1 })).status).toBe(400);

    // منتور نمی‌تواند لاگ ثبت کند؛ غریبه هم نه
    expect((await log(m, id, { itemId: item.id, date: today(), status: "COMPLETED" })).status).toBe(404);
    expect((await log(await makeUser(), id, { itemId: item.id, date: today(), status: "COMPLETED" })).status).toBe(404);

    const mv = await j(await getP(m, id));
    expect(mv.role).toBe("MENTOR");
    expect(mv.logs).toHaveLength(1);
    expect(mv.logs[0]).toMatchObject({ itemId: item.id, date: dayOffset(-1), status: "COMPLETED" });
    expect(mv.program.progress).toMatchObject({ completed: 1, rate: 100 });
    // فیلترِ بازه
    const filtered = await j(await getP(m, id, `?from=${today()}&to=${today()}`));
    expect(filtered.logs).toHaveLength(0);
    expect((await getP(m, id, "?from=bad&to=bad")).status).toBe(400);
  });

  it("آیتمِ هفتگی برای روزِ خارج از برنامه ۴۰۰", async () => {
    const { m, s, ms } = await pair();
    const wd = jsDayOf(today());
    const other = (wd + 1) % 7;
    const id = await activeProgram(m, s, ms, { startDate: dayOffset(-7), items: [{ title: "باشگاه", repeat: "WEEKLY", days: [other] }] });
    const [item] = await items(s, id);
    expect((await log(s, id, { itemId: item.id, date: today(), status: "COMPLETED" })).status).toBe(400);
    // روزی در گذشته که همان روزِ هفته است
    const ok = [...Array(7).keys()].map((i) => dayOffset(-i - 1)).find((d) => jsDayOf(d) === other)!;
    expect((await log(s, id, { itemId: item.id, date: ok, status: "MISSED" })).status).toBe(200);
  });

  it("لاگ بعد از پایانِ رابطه ۴۰۹ (برنامه هم لغو شده)", async () => {
    const { m, s, ms } = await pair();
    const id = await activeProgram(m, s, ms);
    const [item] = await items(s, id);
    await prisma.mentorship.update({ where: { id: ms }, data: { status: "ENDED" } });
    expect((await log(s, id, { itemId: item.id, date: today(), status: "COMPLETED" })).status).toBe(409);
  });
});

describe("فیدبک", () => {
  it("منتور با item/log معتبر فیدبک می‌دهد؛ اعتبارسنجیِ تعلق به برنامه؛ شاگرد read می‌کند", async () => {
    const { m, s, ms } = await pair();
    const id = await activeProgram(m, s, ms, { startDate: dayOffset(-2), items: [{ title: "اسکوات", repeat: "DAILY" }, { title: "پلانک", repeat: "DAILY" }] });
    const other = await activeProgram(m, s, ms, { title: "دیگر" });
    const [i1, i2] = await items(s, id);
    const [foreignItem] = await items(s, other);
    const l1 = (await j(await log(s, id, { itemId: i1.id, date: today(), status: "COMPLETED" }))).log;
    const foreignLog = (await j(await log(s, other, { itemId: foreignItem.id, date: today(), status: "COMPLETED" }))).log;

    expect((await feedback(m, id, { body: "" })).status).toBe(400);
    expect((await feedback(m, id, { body: "x", itemId: foreignItem.id })).status).toBe(404);
    expect((await feedback(m, id, { body: "x", logId: foreignLog.id })).status).toBe(404);
    expect((await feedback(m, id, { body: "x", itemId: i2.id, logId: l1.id })).status).toBe(400);
    expect((await feedback(m, id, { body: "x", itemId: 123 })).status).toBe(400);
    // شاگرد و منتورِ دیگر نمی‌توانند فیدبک بدهند
    expect((await feedback(s, id, { body: "x" })).status).toBe(404);
    expect((await feedback(await makeMentor(), id, { body: "x" })).status).toBe(404);

    const f1 = await feedback(m, id, { body: "عالی بود", logId: l1.id });
    expect(f1.status).toBe(200);
    const fb = (await j(f1)).feedback;
    expect(fb).toMatchObject({ itemId: i1.id, logId: l1.id, itemTitle: "اسکوات", readAt: null });
    expect((await feedback(m, id, { body: "کلی", itemId: i2.id })).status).toBe(200);
    expect(await prisma.inAppNotification.count({ where: { userId: s, type: "program.feedback" } })).toBeGreaterThanOrEqual(1);

    const sv = await j(await getP(s, id));
    expect(sv.role).toBe("STUDENT");
    expect(sv.feedback).toHaveLength(2);
    expect(sv.feedback.every((f: any) => f.readAt === null)).toBe(true);

    // منتور نمی‌تواند برای شاگرد read بزند
    as(m);
    expect((await readFeedback(req("POST", "/x"), p(id))).status).toBe(404);
    as(s);
    const rd = await readFeedback(req("POST", "/x"), p(id));
    expect((await j(rd)).count).toBe(2);
    expect((await j(await getP(s, id))).feedback.every((f: any) => f.readAt)).toBe(true);
  });

  it("فیدبک روی پیش‌نویس ۴۰۹", async () => {
    const { m, ms } = await pair();
    const id = await createProgramId(m, ms);
    expect((await feedback(m, id, { body: "x" })).status).toBe(409);
  });
});

describe("منتورِ تعلیق‌شده", () => {
  it("پذیرشِ برنامه ۴۰۳، فیدبک ۴۰۳، ساختِ برنامه ۴۰۳، send ۴۰۳", async () => {
    const { m, s, ms } = await pair();
    const pending = await createProgramId(m, ms);
    await transition(m, pending, "send");
    const active = await activeProgram(m, s, ms);
    const draft = await createProgramId(m, ms);
    await prisma.mentorProfile.update({ where: { userId: m }, data: { suspendedAt: new Date() } });

    expect((await transition(s, pending, "accept")).status).toBe(403);
    expect((await feedback(m, active, { body: "x" })).status).toBe(403);
    expect((await createProgram(m, ms)).status).toBe(403);
    expect((await transition(m, draft, "send")).status).toBe(403);
    // شاگرد هنوز می‌تواند رد کند/لغو کند (خروج همیشه آزاد است)
    expect((await transition(s, pending, "reject")).status).toBe(200);
  });
});
