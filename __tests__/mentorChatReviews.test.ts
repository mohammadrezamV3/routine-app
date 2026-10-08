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
import { GET as getUnread } from "@/app/api/mentorships/unread/route";
import { GET as listMentorships } from "@/app/api/mentorships/route";
import { POST as postReview, PUT as putReview, DELETE as deleteReview } from "@/app/api/mentors/[mentorId]/reviews/route";
import { GET as mentorPage } from "@/app/api/mentors/[mentorId]/route";
import { GET as getNotifs, PATCH as patchNotifs } from "@/app/api/notifications/route";
import { as, req, j, makeUser, makeMentor, cleanupUsers, connect, requestMentorship, mentorshipAction } from "./helpers/mentorTestUtils";
import { encFor, openAs } from "./helpers/e2eeTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

// گفت‌وگو رمزگذاری سرتاسری دارد: متن روی «دستگاه» (همین تست، webcrypto Node)
// رمز می‌شود و فقط متن رمزشده به سرور می‌رود. رشته‌ی غیرمتنی/خالی/بلند به
// همان شکل خام (body) فرستاده می‌شود تا رد متن ساده هم تست شود.
async function send(userId: string | null, id: string, body: unknown) {
  let payload: unknown = { body };
  if (typeof body === "string" && body.trim() && body.length <= 2000 && userId) {
    const rel = await prisma.mentorship.findUnique({ where: { id }, select: { mentorId: true, studentId: true } });
    if (rel && (rel.mentorId === userId || rel.studentId === userId)) {
      const { frankingKey: _fk, ...enc } = await encFor(id, userId, body.trim());
      payload = enc;
    }
  }
  as(userId);
  return postMessage(req("POST", `/api/mentorships/${id}/messages`, payload), { params: { id } });
}
/** متن پیام‌های یک GET از دید viewer (رمزگشایی روی «دستگاه» او) */
async function texts(viewerId: string, id: string, v: any): Promise<string[]> {
  const out: string[] = [];
  for (const m of v.messages) {
    const d: any = await openAs(viewerId, id, m);
    out.push(typeof d === "string" ? d : d.text);
  }
  return out;
}
async function read(userId: string | null, id: string) {
  as(userId);
  return getMessages(req("GET", `/api/mentorships/${id}/messages`), { params: { id } });
}
async function unread(userId: string) {
  as(userId);
  return j(await getUnread());
}
async function review(userId: string, mentorId: string, body: Record<string, unknown>, method: "POST" | "PUT" = "POST") {
  as(userId);
  const fn = method === "POST" ? postReview : putReview;
  return fn(req(method, `/api/mentors/${mentorId}/reviews`, body), { params: { mentorId } });
}
async function page(userId: string, mentorId: string) {
  as(userId);
  return j(await mentorPage(req("GET", "/x"), { params: { mentorId } }));
}

describe("چت", () => {
  it("ارسال/دریافت، شمارش خوانده‌نشده، read با GET، اعلان throttled", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);

    const r1 = await send(s, id, "  سلام استاد  ");
    expect(r1.status).toBe(200);
    const m1 = (await j(r1)).message;
    expect(m1).toMatchObject({ mine: true, readAt: null, legacyBody: null });
    expect(m1).not.toHaveProperty("body");
    expect(JSON.stringify(m1)).not.toContain("سلام");
    expect((await send(s, id, "سوال دوم")).status).toBe(200);

    // فقط یک اعلان «پیام جدید» برای دو پیام پشت‌سرهم
    expect(await prisma.inAppNotification.count({ where: { userId: m, type: "message.new" } })).toBe(1);

    expect(await unread(m)).toEqual({ total: 2, byMentorship: { [id]: 2 } });
    expect((await unread(s)).total).toBe(0);
    as(m);
    const rows = (await j(await listMentorships(req("GET", "/api/mentorships?role=mentor")))).mentorships;
    expect(rows.find((x: any) => x.id === id).unread).toBe(2);

    // فرستنده GET می‌زند: پیام‌های خودش read نمی‌شوند
    const sv = await j(await read(s, id));
    expect(sv.messages.map((x: any) => x.mine)).toEqual([true, true]);
    expect(sv.canSend).toBe(true);
    expect((await unread(m)).total).toBe(2);

    const mv = await j(await read(m, id));
    expect(await texts(m, id, mv)).toEqual(["سلام استاد", "سوال دوم"]);
    expect(mv.messages.every((x: any) => x.mine === false)).toBe(true);
    expect((await unread(m)).total).toBe(0);
    expect(await prisma.mentorMessage.count({ where: { mentorshipId: id, readAt: null } })).toBe(0);

    expect((await send(m, id, "جواب")).status).toBe(200);
    expect((await unread(s)).byMentorship[id]).toBe(1);
  });

  it("غیر شرکت‌کننده ۴۰۴؛ ناشناس ۴۰۱؛ پیام خالی/بلند ۴۰۰", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);
    const x = await makeUser();
    expect((await read(x, id)).status).toBe(404);
    expect((await send(x, id, "hi")).status).toBe(404);
    const otherMentor = await makeMentor();
    expect((await read(otherMentor, id)).status).toBe(404);
    expect((await read(null, id)).status).toBe(401);
    expect((await send(s, id, "   ")).status).toBe(400);
    expect((await send(s, id, 42)).status).toBe(400);
    expect((await send(s, id, "ا".repeat(2001))).status).toBe(400);
    expect(await unread(x)).toEqual({ total: 0, byMentorship: {} });
  });

  it("رابطه‌ی ENDED: فقط‌خواندنی (canSend=false، ارسال ۴۰۹)؛ PENDING بدون چت (۴۰۳)", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);
    await send(s, id, "قبل از پایان");
    await mentorshipAction(m, id, "end");
    const r = await send(s, id, "بعد از پایان");
    expect(r.status).toBe(409);
    expect((await send(m, id, "x")).status).toBe(409);
    const v = await j(await read(m, id));
    expect(v.canSend).toBe(false);
    expect(await texts(m, id, v)).toEqual(["قبل از پایان"]);

    const m2 = await makeMentor();
    const s2 = await makeUser();
    const pid = (await j(await requestMentorship(s2, m2))).mentorship.id;
    expect((await read(s2, pid)).status).toBe(403);
    expect((await send(s2, pid, "x")).status).toBe(409);
  });

  it("رابطه‌ی BLOCKED: پیام‌های خوانده‌نشده در unread شمرده نمی‌شوند", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);
    await send(s, id, "x");
    await mentorshipAction(m, id, "block");
    expect((await unread(m)).total).toBe(0);
    expect((await read(m, id)).status).toBe(403);
  });

  it("منتور تعلیق‌شده: ارسال پیام از هر دو طرف ۴۰۳", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);
    await prisma.mentorProfile.update({ where: { userId: m }, data: { suspendedAt: new Date() } });
    expect((await send(m, id, "x")).status).toBe(403);
    expect((await send(s, id, "x")).status).toBe(403);
  });
});

describe("نظرها", () => {
  it("بدون رابطه یا فقط PENDING/REJECTED → ۴۰۳؛ خود → ۴۰۴؛ امتیاز نامعتبر ۴۰۰", async () => {
    const m = await makeMentor();
    const none = await makeUser();
    expect((await review(none, m, { rating: 5 })).status).toBe(403);

    const pend = await makeUser();
    await requestMentorship(pend, m);
    expect((await review(pend, m, { rating: 5 })).status).toBe(403);
    expect((await page(pend, m)).canReview).toBe(false);

    const rej = await makeUser();
    const rid = (await j(await requestMentorship(rej, m))).mentorship.id;
    await mentorshipAction(m, rid, "reject");
    expect((await review(rej, m, { rating: 1 })).status).toBe(403);

    expect((await review(m, m, { rating: 5 })).status).toBe(404);

    const s = await makeUser();
    await connect(s, m);
    for (const bad of [0, 6, 4.5, "5", null]) expect((await review(s, m, { rating: bad })).status).toBe(400);
    expect((await review(s, m, { rating: 5, body: 42 })).status).toBe(400);
  });

  it("ثبت، تکراری ۴۰۹، میانگین بازمحاسبه، ویرایش/حذف، و ENDED بعد از شروع هم مجاز", async () => {
    const m = await makeMentor();
    const s1 = await makeUser({ name: "علی" });
    const s2 = await makeUser();
    await connect(s1, m);
    const ms2 = await connect(s2, m);
    expect((await page(s1, m)).canReview).toBe(true);

    const r = await review(s1, m, { rating: 5, body: "عالی" });
    expect(r.status).toBe(200);
    const rb = await j(r);
    expect(rb.review).toMatchObject({ rating: 5, body: "عالی", student: { name: "علی" } });
    expect(JSON.stringify(rb)).not.toMatch(/email|studentId/);
    expect((await review(s1, m, { rating: 1 })).status).toBe(409);

    await mentorshipAction(s2, ms2, "end");
    expect((await review(s2, m, { rating: 2 })).status).toBe(200);

    let prof = await prisma.mentorProfile.findUnique({ where: { userId: m } });
    expect(prof!.ratingAvg).toBeCloseTo(3.5);
    expect(prof!.ratingCount).toBe(2);
    const pg = await page(s1, m);
    expect(pg.mentor.ratingAvg).toBe(3.5);
    expect(pg.reviews).toHaveLength(2);
    expect(pg.canReview).toBe(false);
    expect(pg.myReview.rating).toBe(5);

    expect((await review(s2, m, { rating: 4 }, "PUT")).status).toBe(200);
    prof = await prisma.mentorProfile.findUnique({ where: { userId: m } });
    expect(prof!.ratingAvg).toBeCloseTo(4.5);

    as(s2);
    expect((await deleteReview(req("DELETE", "/x"), { params: { mentorId: m } })).status).toBe(200);
    prof = await prisma.mentorProfile.findUnique({ where: { userId: m } });
    expect(prof!.ratingAvg).toBeCloseTo(5);
    expect(prof!.ratingCount).toBe(1);

    // کاربری که نظر ندارد نمی‌تواند PUT/DELETE کند
    const x = await makeUser();
    expect((await review(x, m, { rating: 1 }, "PUT")).status).toBe(404);
    as(x);
    expect((await deleteReview(req("DELETE", "/x"), { params: { mentorId: m } })).status).toBe(404);
  });
});

describe("اعلان‌ها", () => {
  it("فقط اعلان‌های خودم؛ علامت خوانده با ids (id دیگران بی‌اثر) و all", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const mk = (userId: string, t: string) => prisma.inAppNotification.create({ data: { userId, type: "t", title: t, body: t, url: "/x" } });
    const a1 = await mk(a, "a1");
    const a2 = await mk(a, "a2");
    await mk(a, "a3");
    const b1 = await mk(b, "b1");

    as(null);
    expect((await getNotifs(req("GET", "/api/notifications"))).status).toBe(401);

    as(a);
    let r = await j(await getNotifs(req("GET", "/api/notifications")));
    expect(r.notifications.map((n: any) => n.title).sort()).toEqual(["a1", "a2", "a3"]);
    expect(r.unread).toBe(3);

    expect((await patchNotifs(req("PATCH", "/x", { ids: [a1.id, b1.id] }))).status).toBe(200);
    expect((await prisma.inAppNotification.findUnique({ where: { id: b1.id } }))!.readAt).toBeNull();
    r = await j(await getNotifs(req("GET", "/api/notifications")));
    expect(r.unread).toBe(2);

    expect((await patchNotifs(req("PATCH", "/x", {}))).status).toBe(400);
    expect((await patchNotifs(req("PATCH", "/x", { ids: [] }))).status).toBe(400);

    as(b);
    await patchNotifs(req("PATCH", "/x", { all: true }));
    expect((await prisma.inAppNotification.findUnique({ where: { id: a2.id } }))!.readAt).toBeNull();
    expect((await j(await getNotifs(req("GET", "/api/notifications")))).unread).toBe(0);

    as(a);
    await patchNotifs(req("PATCH", "/x", { all: true }));
    expect((await j(await getNotifs(req("GET", "/api/notifications")))).unread).toBe(0);
    expect((await getNotifs(req("GET", "/api/notifications?before=garbage"))).status).toBe(400);
  });
});
