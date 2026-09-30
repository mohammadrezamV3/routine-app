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
import { GET as getMessages, POST as postMessage } from "@/app/api/mentorships/[id]/messages/route";
import { GET as unread } from "@/app/api/mentorships/unread/route";
import { GET as listHistory, POST as clearHistory } from "@/app/api/mentorships/chat-history/route";
import { POST as reportConversation } from "@/app/api/mentorships/[id]/report/route";
import { GET as adminReports } from "@/app/api/admin/mentors/reports/route";
import { as, req, j, makeUser, makeMentor, cleanupUsers, connect } from "./helpers/mentorTestUtils";
import { encFor, giveKey } from "./helpers/e2eeTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const P = (id: string) => ({ params: { id } });

async function send(userId: string, msId: string, text: string) {
  const { frankingKey, ...enc } = await encFor(msId, userId, text);
  as(userId);
  const res = await postMessage(req("POST", "/x", enc), P(msId));
  expect(res.status).toBe(200);
  const id = (await j(res)).message.id as string;
  return { id, text, frankingKey };
}

async function setup() {
  const m = await makeMentor();
  const s = await makeUser();
  const ms = await connect(s, m);
  await giveKey(m);
  await giveKey(s);
  return { m, s, ms };
}

async function messageIds(userId: string, msId: string): Promise<string[]> {
  as(userId);
  const d = await j(await getMessages(req("GET", `/api/mentorships/${msId}/messages`) as any, P(msId)));
  return d.messages.map((x: { id: string }) => x.id);
}

// ───────────────────────── پاک کردن سابقه ─────────────────────────

describe("سابقه‌ی گفت‌وگو: پاک کردن فقط برای خودِ کاربر", () => {
  it("پیام‌های پیش از پاک‌کردن برای من برنمی‌گردند، برای طرفِ مقابل دست‌نخورده‌اند؛ پیامِ تازه دیده می‌شود", async () => {
    const { m, s, ms } = await setup();
    const a = await send(m, ms, "یک");
    const b = await send(s, ms, "دو");

    as(s);
    const res = await clearHistory(req("POST", "/x", { mentorshipId: ms }));
    expect(res.status).toBe(200);

    expect(await messageIds(s, ms)).toEqual([]);
    // نسخه‌ی منتور همان است و ردیف‌ها حذف نشده‌اند
    expect(await messageIds(m, ms)).toEqual([a.id, b.id]);
    expect(await prisma.mentorMessage.count({ where: { mentorshipId: ms } })).toBe(2);

    await new Promise((r) => setTimeout(r, 5));
    const c = await send(m, ms, "سه");
    expect(await messageIds(s, ms)).toEqual([c.id]);

    // صفحه‌بندیِ قدیمی‌تر هم از مرزِ پاک‌شده عبور نمی‌کند
    as(s);
    const older = await j(await getMessages(req("GET", `/api/mentorships/${ms}/messages?before=${encodeURIComponent(new Date().toISOString())}`) as any, P(ms)));
    expect(older.messages.map((x: { id: string }) => x.id)).toEqual([c.id]);
  });

  it("پیام‌های خوانده‌نشده‌ی پاک‌شده دیگر در شمارنده نیستند؛ فهرستِ سابقه تعداد و زمانِ پاک‌کردن را می‌دهد", async () => {
    const { m, s, ms } = await setup();
    await send(m, ms, "خوانده نشده ۱");
    await send(m, ms, "خوانده نشده ۲");
    as(s);
    expect((await j(await unread())).byMentorship[ms]).toBe(2);

    let list = await j(await listHistory());
    expect(list.conversations.find((c: any) => c.id === ms)).toMatchObject({ role: "student", messageCount: 2, clearedAt: null });

    await clearHistory(req("POST", "/x", { mentorshipId: ms }));
    as(s);
    expect((await j(await unread())).byMentorship[ms]).toBeUndefined();
    list = await j(await listHistory());
    const row = list.conversations.find((c: any) => c.id === ms);
    expect(row.messageCount).toBe(0);
    expect(row.clearedAt).not.toBeNull();
    // فهرست متن ندارد
    expect(JSON.stringify(list)).not.toContain("خوانده نشده");
  });

  it("«پاک کردن همه» همه‌ی گفت‌وگوهای من را پاک می‌کند، نه گفت‌وگوهای دیگران", async () => {
    const { m, s, ms } = await setup();
    const m2 = await makeMentor();
    const ms2 = await connect(s, m2);
    await giveKey(m2);
    await send(m, ms, "الف");
    await send(m2, ms2, "ب");
    // رابطه‌ی بی‌ربط
    const o = await setup();
    const foreign = await send(o.m, o.ms, "مال دیگران");

    as(s);
    const res = await j(await clearHistory(req("POST", "/x", { all: true })));
    expect(res.cleared).toBe(2);
    expect(await messageIds(s, ms)).toEqual([]);
    expect(await messageIds(s, ms2)).toEqual([]);
    expect(await messageIds(o.s, o.ms)).toEqual([foreign.id]);
    const rel = await prisma.mentorship.findUniqueOrThrow({ where: { id: o.ms } });
    expect(rel.studentClearedBefore).toBeNull();
    expect(rel.mentorClearedBefore).toBeNull();
  });

  it("IDOR: پاک کردنِ گفت‌وگوی دیگران ۴۰۴ و بی‌اثر است؛ بدونِ نشست ۴۰۱", async () => {
    const { m, s, ms } = await setup();
    await send(m, ms, "محرمانه");
    const stranger = await makeUser();
    as(stranger);
    expect((await clearHistory(req("POST", "/x", { mentorshipId: ms }))).status).toBe(404);
    const rel = await prisma.mentorship.findUniqueOrThrow({ where: { id: ms } });
    expect(rel.studentClearedBefore).toBeNull();
    expect(rel.mentorClearedBefore).toBeNull();
    expect((await prisma.mentorMessage.findMany({ where: { mentorshipId: ms } })).every((x) => x.readAt === null)).toBe(true);
    // فهرستِ غریبه این گفت‌وگو را ندارد
    const list = await j(await listHistory());
    expect(list.conversations.some((c: any) => c.id === ms)).toBe(false);
    as(null);
    expect((await listHistory()).status).toBe(401);
    void s;
  });

  it("پاک کردن توسطِ منتور ستونِ خودِ منتور را می‌زند", async () => {
    const { m, s, ms } = await setup();
    await send(s, ms, "سلام");
    as(m);
    await clearHistory(req("POST", "/x", { mentorshipId: ms }));
    const rel = await prisma.mentorship.findUniqueOrThrow({ where: { id: ms } });
    expect(rel.mentorClearedBefore).not.toBeNull();
    expect(rel.studentClearedBefore).toBeNull();
    expect(await messageIds(m, ms)).toEqual([]);
    expect(await messageIds(s, ms)).toHaveLength(1);
  });
});

// ───────────────────────── گزارشِ گفت‌وگو ─────────────────────────

describe("گزارشِ گفت‌وگو: هر پیام جداگانه با فرانکینگ تایید می‌شود", () => {
  it("پیامِ جعلی لای پیام‌های واقعی → کلِ گزارش رد؛ گزارشِ درست فقط پیام‌های انتخاب‌شده را به ادمین می‌دهد", async () => {
    const { m, s, ms } = await setup();
    const x1 = await send(m, ms, "پیام آزارنده‌ی اول");
    const x2 = await send(s, ms, "جواب شاگرد");
    const x3 = await send(m, ms, "پیام آزارنده‌ی دوم");
    const hidden = await send(m, ms, "پیامی که انتخاب نشده");

    const report = (body: Record<string, unknown>) => { as(s); return reportConversation(req("POST", "/x", body), P(ms)); };
    const item = (x: { id: string; text: string; frankingKey: string }, text = x.text) => ({ id: x.id, text, frankingKey: x.frankingKey });

    // متنِ جعلی برای یکی از پیام‌ها
    let res = await report({ reason: "آزار", messages: [item(x1), item(x2), item(x3, "متنی که منتور هرگز نفرستاد")] });
    expect(res.status).toBe(400);
    expect((await j(res)).messageId).toBe(x3.id);
    // کلیدِ فرانکینگِ پیامِ دیگر
    res = await report({ reason: "آزار", messages: [{ id: x1.id, text: x1.text, frankingKey: x3.frankingKey }] });
    expect(res.status).toBe(400);
    // بدونِ مدرک
    res = await report({ reason: "آزار", messages: [{ id: x1.id }] });
    expect(res.status).toBe(400);
    // دست‌کاریِ برچسبِ سرور
    const orig = await prisma.mentorMessage.findUniqueOrThrow({ where: { id: x1.id }, select: { serverTag: true } });
    await prisma.mentorMessage.update({ where: { id: x1.id }, data: { serverTag: "n0:AAAA" } });
    expect((await report({ reason: "آزار", messages: [item(x1)] })).status).toBe(400);
    await prisma.mentorMessage.update({ where: { id: x1.id }, data: { serverTag: orig.serverTag } });
    // فقط پیام‌های خودم (بدونِ پیامی از طرفِ مقابل)
    expect((await report({ reason: "آزار", messages: [item(x2)] })).status).toBe(400);
    // خالی و بیش از سقف
    expect((await report({ reason: "آزار", messages: [] })).status).toBe(400);
    expect((await report({ reason: "آزار", messages: Array.from({ length: 51 }, () => item(x1)) })).status).toBe(400);
    // تکراری
    expect((await report({ reason: "آزار", messages: [item(x1), item(x1)] })).status).toBe(400);
    expect(await prisma.mentorReport.count({ where: { reporterId: s } })).toBe(0);

    res = await report({ reason: "آزار", details: "چند بار تکرار شد", messages: [item(x3), item(x1), item(x2)] });
    expect(res.status).toBe(200);
    const rep = await prisma.mentorReport.findFirstOrThrow({ where: { reporterId: s }, include: { messages: { orderBy: { position: "asc" } } } });
    expect(rep).toMatchObject({ targetType: "CONVERSATION", targetId: ms, targetUserId: m, reportVerified: true });
    // به ترتیبِ زمان، متن رمزشده در حالِ سکون
    expect(rep.messages.map((x) => x.messageId)).toEqual([x1.id, x2.id, x3.id]);
    expect(rep.messages.every((x) => x.verified && x.text.startsWith("enc1:"))).toBe(true);
    expect(JSON.stringify(rep)).not.toContain("آزارنده");

    // تکرارِ گزارشِ همان گفت‌وگو
    expect((await report({ reason: "آزار", messages: [item(x1)] })).status).toBe(409);

    const admin = await makeUser({ adminPermissions: ["mentors"] });
    as(admin);
    const list = await j(await adminReports(req("GET", "/api/admin/mentors/reports?status=OPEN") as any));
    const r = list.reports.find((x: any) => x.id === rep.id);
    expect(r.target.kind).toBe("CONVERSATION");
    expect(r.target.messages.map((x: any) => x.text)).toEqual(["پیام آزارنده‌ی اول", "جواب شاگرد", "پیام آزارنده‌ی دوم"]);
    expect(r.target.messages.every((x: any) => x.verified)).toBe(true);
    expect(JSON.stringify(list)).not.toContain(hidden.text);
  });

  it("IDOR: غریبه نمی‌تواند گفت‌وگوی دیگران را گزارش کند؛ پیامِ گفت‌وگوی دیگر پذیرفته نمی‌شود", async () => {
    const { m, s, ms } = await setup();
    const x = await send(m, ms, "پیام");
    const o = await setup();
    const y = await send(o.m, o.ms, "پیام گفت‌وگوی دیگر");

    const stranger = await makeUser();
    as(stranger);
    expect((await reportConversation(req("POST", "/x", { reason: "آزار", messages: [{ id: x.id, text: x.text, frankingKey: x.frankingKey }] }), P(ms))).status).toBe(404);

    // پیامِ رابطه‌ی دیگر (حتی با مدرکِ درست) در گزارشِ این گفت‌وگو پیدا نمی‌شود
    as(s);
    const res = await reportConversation(req("POST", "/x", { reason: "آزار", messages: [{ id: y.id, text: y.text, frankingKey: y.frankingKey }] }), P(ms));
    expect(res.status).toBe(400);
    expect(await prisma.mentorReport.count({ where: { targetType: "CONVERSATION", targetId: { in: [ms, o.ms] } } })).toBe(0);
  });

  it("پیامی که گزارش‌دهنده برای خودش پاک کرده پذیرفته نمی‌شود", async () => {
    const { m, s, ms } = await setup();
    const x = await send(m, ms, "قبل از پاک کردن");
    as(s);
    await clearHistory(req("POST", "/x", { mentorshipId: ms }));
    as(s);
    const res = await reportConversation(req("POST", "/x", { reason: "آزار", messages: [{ id: x.id, text: x.text, frankingKey: x.frankingKey }] }), P(ms));
    expect(res.status).toBe(400);
  });
});

// ───────────────────────── پذیرشِ دعوت و شرایطِ منتورها ─────────────────────────

describe("پذیرشِ دعوتِ منتور توسطِ شاگرد: شرایطِ منتورها لازم است", () => {
  it("بدونِ پذیرش ۴۰۰ با کدِ MENTOR_TERMS_REQUIRED؛ با نسخه‌ی جاری فعال می‌شود و پذیرش روی کاربر و رابطه ثبت می‌شود", async () => {
    const { MENTOR_TERMS_VERSION } = await import("@/lib/mentorTerms");
    const { POST: postMentorship } = await import("@/app/api/mentorships/route");
    const { PATCH: patchMentorship } = await import("@/app/api/mentorships/[id]/route");
    const m = await makeMentor();
    const s = await makeUser();
    const su = await prisma.user.findUniqueOrThrow({ where: { id: s }, select: { username: true } });
    as(m);
    const inv = await postMentorship(req("POST", "/api/mentorships", { studentUsername: su.username }));
    expect(inv.status).toBe(200);
    const ms = await prisma.mentorship.findFirstOrThrow({ where: { mentorId: m, studentId: s } });

    as(s);
    const no = await patchMentorship(req("PATCH", "/x", { action: "accept" }), P(ms.id));
    expect(no.status).toBe(400);
    expect((await j(no)).code).toBe("MENTOR_TERMS_REQUIRED");
    // نسخه‌ی کهنه هم پذیرفته نمی‌شود
    as(s);
    expect((await patchMentorship(req("PATCH", "/x", { action: "accept", acceptMentorTerms: "2000-01-01" }), P(ms.id))).status).toBe(400);
    expect((await prisma.mentorship.findUniqueOrThrow({ where: { id: ms.id } })).status).toBe("PENDING");

    as(s);
    const ok = await patchMentorship(req("PATCH", "/x", { action: "accept", acceptMentorTerms: MENTOR_TERMS_VERSION }), P(ms.id));
    expect(ok.status).toBe(200);
    const rel = await prisma.mentorship.findUniqueOrThrow({ where: { id: ms.id } });
    expect(rel.status).toBe("ACTIVE");
    expect(rel.studentTermsVersion).toBe(MENTOR_TERMS_VERSION);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: s } });
    expect(u.mentorStudentTermsVersion).toBe(MENTOR_TERMS_VERSION);
    expect(u.mentorStudentTermsAcceptedAt).not.toBeNull();
  });
});
