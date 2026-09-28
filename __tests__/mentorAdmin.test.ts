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
import { GET as adminList } from "@/app/api/admin/mentors/route";
import { GET as adminDetail } from "@/app/api/admin/mentors/[profileId]/route";
import { POST as verify } from "@/app/api/admin/mentors/[profileId]/verification/route";
import { POST as suspend } from "@/app/api/admin/mentors/[profileId]/suspend/route";
import { GET as adminDoc } from "@/app/api/admin/mentors/documents/[docId]/route";
import { GET as adminReviews } from "@/app/api/admin/mentors/reviews/route";
import { PATCH as patchReview } from "@/app/api/admin/mentors/reviews/[id]/route";
import { GET as adminReports } from "@/app/api/admin/mentors/reports/route";
import { PATCH as patchReport } from "@/app/api/admin/mentors/reports/[id]/route";
import { GET as discover } from "@/app/api/mentors/route";
import { GET as mentorPage } from "@/app/api/mentors/[mentorId]/route";
import { POST as postReview } from "@/app/api/mentors/[mentorId]/reviews/route";
import { POST as postReport } from "@/app/api/mentor-reports/route";
import { POST as postMessage } from "@/app/api/mentorships/[id]/messages/route";
import { as, req, j, makeUser, makeMentor, cleanupUsers, connect, pngBytes, uniqueTag } from "./helpers/mentorTestUtils";
import { encFor } from "./helpers/e2eeTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

type Target = { userId: string; profileId: string; docId: string; reviewId: string };

/** منتور + یک مدرک (مستقیم در دیتابیس) + یک نظرِ VISIBLE از یک شاگردِ واقعی */
async function mentorTarget(opts: { adminPermissions?: string[]; owner?: boolean; username?: string } = {}): Promise<Target> {
  const userId = await makeMentor({ adminPermissions: opts.adminPermissions, username: opts.username });
  if (opts.owner) await prisma.user.update({ where: { id: userId }, data: { isSuperAdmin: true } });
  const profile = (await prisma.mentorProfile.findUnique({ where: { userId } }))!;
  const bytes = Buffer.from(pngBytes(64));
  const doc = await prisma.mentorDocument.create({
    data: { profileId: profile.id, kind: "IDENTITY", fileName: "id.png", mimeType: "image/png", sizeBytes: bytes.length, sha256: "x", data: bytes },
  });
  const s = await makeUser();
  await connect(s, userId);
  as(s);
  const r = await postReview(req("POST", "/x", { rating: 4, body: "خوب" }), { params: { mentorId: userId } });
  if (r.status !== 200) throw new Error("review " + r.status);
  const review = (await prisma.mentorReview.findFirst({ where: { mentorId: userId } }))!;
  return { userId, profileId: profile.id, docId: doc.id, reviewId: review.id };
}

const act = {
  // makeMentor هویت را تأییدشده می‌سازد (احرازِ اجباری)؛ برای سنجیدنِ خودِ اقدامِ تأیید،
  // هدف پیش از هر بار به «ارسال نشده» برمی‌گردد
  verify: async (t: Target) => {
    await prisma.mentorProfile.update({ where: { id: t.profileId }, data: { identityStatus: "NOT_PROVIDED" } });
    return verify(req("POST", "/x", { kind: "IDENTITY", status: "VERIFIED" }) as any, { params: { profileId: t.profileId } });
  },
  suspend: (t: Target) => suspend(req("POST", "/x", { suspend: true, reason: "تست" }) as any, { params: { profileId: t.profileId } }),
  unsuspend: (t: Target) => suspend(req("POST", "/x", { suspend: false }) as any, { params: { profileId: t.profileId } }),
  doc: (t: Target) => adminDoc(req("GET", "/x") as any, { params: { docId: t.docId } }),
  hide: (t: Target) => patchReview(req("PATCH", "/x", { status: "HIDDEN", reason: "توهین" }) as any, { params: { id: t.reviewId } }),
};

async function statusesAs(actor: string, t: Target, withSuspended = true) {
  as(actor);
  const out: Record<string, number> = {};
  out.verify = (await act.verify(t)).status;
  out.suspend = (await act.suspend(t)).status;
  if (withSuspended) {
    // برای سنجشِ unsuspend، پروفایل واقعا معلق باشد
    await prisma.mentorProfile.update({ where: { id: t.profileId }, data: { suspendedAt: new Date() } });
    as(actor);
    out.unsuspend = (await act.unsuspend(t)).status;
    await prisma.mentorProfile.update({ where: { id: t.profileId }, data: { suspendedAt: null } });
    as(actor);
  }
  out.doc = (await act.doc(t)).status;
  out.hide = (await act.hide(t)).status;
  return out;
}

describe("ادمین — احرازِ هویتِ خودِ درخواست", () => {
  it("ناشناس و کاربرِ عادی ۴۰۱ روی همه‌ی روت‌های /api/admin/mentors/*", async () => {
    const t = await mentorTarget();
    for (const who of [null, await makeUser(), t.userId]) {
      as(who);
      expect((await adminList(req("GET", "/api/admin/mentors") as any)).status).toBe(401);
      expect((await adminDetail(req("GET", "/x") as any, { params: { profileId: t.profileId } })).status).toBe(401);
      expect((await adminReviews(req("GET", "/x") as any)).status).toBe(401);
      expect((await adminReports(req("GET", "/x") as any)).status).toBe(401);
      expect((await patchReport(req("PATCH", "/x", { status: "DISMISSED" }) as any, { params: { id: "x" } })).status).toBe(401);
      as(who);
      const s = await statusesAs(who as any, t, false);
      expect(s).toEqual({ verify: 401, suspend: 401, doc: 401, hide: 401 });
    }
    expect((await prisma.mentorProfile.findUnique({ where: { id: t.profileId } }))!.identityStatus).toBe("NOT_PROVIDED");
  });

  it("ادمینِ بدونِ دسترسیِ mentors → ۴۰۳", async () => {
    const t = await mentorTarget();
    const support = await makeUser({ adminPermissions: ["support", "users.view"] });
    as(support);
    expect((await adminList(req("GET", "/api/admin/mentors") as any)).status).toBe(403);
    expect((await adminDetail(req("GET", "/x") as any, { params: { profileId: t.profileId } })).status).toBe(403);
    expect(await statusesAs(support, t, false)).toEqual({ verify: 403, suspend: 403, doc: 403, hide: 403 });
  });

  it("ادمینِ مسدودشده حتی با دسترسی ۴۰۱", async () => {
    const t = await mentorTarget();
    const a = await makeUser({ adminPermissions: ["mentors"] });
    await prisma.user.update({ where: { id: a }, data: { isBlocked: true } });
    as(a);
    expect((await adminList(req("GET", "/x") as any)).status).toBe(401);
    expect((await act.doc(t)).status).toBe(401);
  });
});

describe("ادمین — قوانینِ «کی روی کی» (loadTarget)", () => {
  it("ادمینِ محدود روی خودش: هیچ اقدامی (verify/suspend/unsuspend/doc/hide)", async () => {
    const self = await mentorTarget({ adminPermissions: ["mentors"] });
    const s = await statusesAs(self.userId, self);
    expect(s).toEqual({ verify: 400, suspend: 400, unsuspend: 400, doc: 400, hide: 400 });
    const p = (await prisma.mentorProfile.findUnique({ where: { id: self.profileId } }))!;
    expect(p.identityStatus).toBe("NOT_PROVIDED");
    expect((await prisma.mentorReview.findUnique({ where: { id: self.reviewId } }))!.status).toBe("VISIBLE");
    expect(await prisma.auditLog.count({ where: { actorUserId: self.userId } })).toBe(0);
  });

  it("ادمینِ محدود روی Owner: ۴۰۳ برای همه", async () => {
    const owner = await mentorTarget({ owner: true });
    const admin = await makeUser({ adminPermissions: ["mentors"] });
    expect(await statusesAs(admin, owner)).toEqual({ verify: 403, suspend: 403, unsuspend: 403, doc: 403, hide: 403 });
  });

  it("ادمینِ محدود روی ادمینِ دیگر: بدونِ admins.manage ۴۰۳، با آن مجاز", async () => {
    const other = await mentorTarget({ adminPermissions: ["support"] });
    const admin = await makeUser({ adminPermissions: ["mentors"] });
    expect(await statusesAs(admin, other)).toEqual({ verify: 403, suspend: 403, unsuspend: 403, doc: 403, hide: 403 });
    const manager = await makeUser({ adminPermissions: ["mentors", "admins.manage"] });
    as(manager);
    expect((await act.verify(other)).status).toBe(200);
    expect((await act.doc(other)).status).toBe(200);
  });

  it("Owner روی ادمینِ محدود مجاز است؛ روی خودش تأیید/مدرک مجاز، تعلیق/پنهان‌کردن نه", async () => {
    const limited = await mentorTarget({ adminPermissions: ["mentors"] });
    const owner = await mentorTarget({ owner: true });
    expect(await statusesAs(owner.userId, limited)).toEqual({ verify: 200, suspend: 200, unsuspend: 200, doc: 200, hide: 200 });
    const own = await statusesAs(owner.userId, owner);
    expect(own).toEqual({ verify: 200, suspend: 400, unsuspend: 400, doc: 200, hide: 400 });
  });

  it("ادمینِ mentors روی منتورِ عادی: همه مجاز + AuditLog", async () => {
    const t = await mentorTarget();
    const admin = await makeUser({ adminPermissions: ["mentors"] });
    expect(await statusesAs(admin, t)).toEqual({ verify: 200, suspend: 200, unsuspend: 200, doc: 200, hide: 200 });
    const actions = (await prisma.auditLog.findMany({ where: { actorUserId: admin }, select: { action: true } })).map((a) => a.action).sort();
    expect(actions).toEqual(["mentor.document_view", "mentor.review_hide", "mentor.suspend", "mentor.unsuspend", "mentor.verify_identity"].sort());
  });
});

describe("ادمین — تعلیق", () => {
  it("تعلیق → حذف از کشف و صفحه‌ی عمومی (برای غریبه)، اعلان به منتور؛ دوباره ۴۰۹؛ رفعِ تعلیق برمی‌گرداند", async () => {
    const tag = uniqueTag();
    const t = await mentorTarget({ username: `${tag}m`.slice(0, 20) });
    const admin = await makeUser({ adminPermissions: ["mentors"] });
    const viewer = await makeUser();

    as(viewer);
    expect((await j(await discover(req("GET", `/api/mentors?q=${tag}`)))).mentors.map((c: any) => c.userId)).toEqual([t.userId]);

    as(admin);
    expect((await act.suspend(t)).status).toBe(200);
    expect((await act.suspend(t)).status).toBe(409);
    expect(await prisma.inAppNotification.count({ where: { userId: t.userId, type: "mentor.suspension" } })).toBe(1);

    as(viewer);
    expect((await j(await discover(req("GET", `/api/mentors?q=${tag}`)))).mentors).toEqual([]);
    expect((await mentorPage(req("GET", "/x"), { params: { mentorId: t.userId } })).status).toBe(404);

    as(admin);
    const l = await j(await adminList(req("GET", "/api/admin/mentors?tab=suspended&q=" + t.userId) as any));
    expect(l.mentors.map((m: any) => m.profileId)).toEqual([t.profileId]);
    expect((await act.unsuspend(t)).status).toBe(200);
    expect((await act.unsuspend(t)).status).toBe(409);

    as(viewer);
    expect((await j(await discover(req("GET", `/api/mentors?q=${tag}`)))).mentors.map((c: any) => c.userId)).toEqual([t.userId]);
    as(admin);
    expect((await suspend(req("POST", "/x", { suspend: "yes" }) as any, { params: { profileId: t.profileId } })).status).toBe(400);
    expect((await suspend(req("POST", "/x", { suspend: true }) as any, { params: { profileId: "nope" } })).status).toBe(404);
  });
});

describe("ادمین — نظرها", () => {
  it("پنهان‌کردن بدونِ دلیل ۴۰۰؛ پنهان → از صفحه‌ی عمومی حذف و میانگین بازمحاسبه؛ بازگردانی", async () => {
    const t = await mentorTarget();
    // نظرِ دوم با امتیاز ۲
    const s2 = await makeUser();
    await connect(s2, t.userId);
    as(s2);
    await postReview(req("POST", "/x", { rating: 2 }), { params: { mentorId: t.userId } });
    let prof = (await prisma.mentorProfile.findUnique({ where: { userId: t.userId } }))!;
    expect(prof.ratingAvg).toBeCloseTo(3);
    expect(prof.ratingCount).toBe(2);

    const admin = await makeUser({ adminPermissions: ["mentors"] });
    as(admin);
    expect((await patchReview(req("PATCH", "/x", { status: "HIDDEN" }) as any, { params: { id: t.reviewId } })).status).toBe(400);
    expect((await patchReview(req("PATCH", "/x", { status: "DELETED" }) as any, { params: { id: t.reviewId } })).status).toBe(400);
    expect((await patchReview(req("PATCH", "/x", { status: "HIDDEN", reason: "x" }) as any, { params: { id: "nope" } })).status).toBe(404);
    expect((await act.hide(t)).status).toBe(200);
    expect((await act.hide(t)).status).toBe(409);

    prof = (await prisma.mentorProfile.findUnique({ where: { userId: t.userId } }))!;
    expect(prof.ratingAvg).toBeCloseTo(2);
    expect(prof.ratingCount).toBe(1);

    const viewer = await makeUser();
    as(viewer);
    const pg = await j(await mentorPage(req("GET", "/x"), { params: { mentorId: t.userId } }));
    expect(pg.reviews.map((r: any) => r.id)).not.toContain(t.reviewId);
    expect(pg.reviews).toHaveLength(1);
    expect(pg.mentor.ratingAvg).toBe(2);

    as(admin);
    const hidden = await j(await adminReviews(req("GET", "/x?status=HIDDEN") as any));
    expect(JSON.stringify(hidden)).toContain(t.reviewId);
    expect((await patchReview(req("PATCH", "/x", { status: "VISIBLE" }) as any, { params: { id: t.reviewId } })).status).toBe(200);
    prof = (await prisma.mentorProfile.findUnique({ where: { userId: t.userId } }))!;
    expect(prof.ratingAvg).toBeCloseTo(3);
  });
});

describe("ادمین — لیست و جزئیات", () => {
  it("صفِ pending؛ جزئیات بدونِ بایتِ فایل و بدونِ ایمیل/شماره", async () => {
    const t = await mentorTarget();
    await prisma.mentorProfile.update({ where: { id: t.profileId }, data: { identityStatus: "PENDING" } });
    const admin = await makeUser({ adminPermissions: ["mentors"] });
    as(admin);
    const l = await j(await adminList(req("GET", "/api/admin/mentors?tab=pending&q=" + t.profileId) as any));
    expect(l.mentors).toHaveLength(1);
    expect(l.mentors[0].pendingCount).toBe(1);
    const d = await j(await adminDetail(req("GET", "/x") as any, { params: { profileId: t.profileId } }));
    expect(d.profile.documents).toHaveLength(1);
    expect(d.profile.documents[0]).not.toHaveProperty("data");
    const txt = JSON.stringify(d);
    expect(txt).not.toMatch(/@example\.com|passwordHash|"phone"|"email"/);
    expect((await adminDetail(req("GET", "/x") as any, { params: { profileId: "nope" } })).status).toBe(404);
  });
});


// گفت‌وگو رمزگذاریِ سرتاسری دارد: گزارشِ پیام متن + کلیدِ فرانکینگِ همان پیام را
// می‌فرستد (همان کاری که کلاینتِ گیرنده بعد از رمزگشایی می‌کند)
const franking = new Map<string, { text: string; frankingKey: string }>();

async function report(userId: string, body: Record<string, unknown>) {
  as(userId);
  const withFranking = body.targetType === "MESSAGE" && !("franking" in body) && franking.has(body.targetId as string)
    ? { ...body, franking: franking.get(body.targetId as string) }
    : body;
  return postReport(req("POST", "/api/mentor-reports", withFranking));
}
async function resolve(adminId: string, id: string, body: Record<string, unknown>) {
  as(adminId);
  return patchReport(req("PATCH", "/x", body) as any, { params: { id } });
}
async function sendMsg(userId: string, msId: string, body: string): Promise<string> {
  const { frankingKey, ...enc } = await encFor(msId, userId, body);
  as(userId);
  const r = await postMessage(req("POST", "/x", enc), { params: { id: msId } });
  if (r.status !== 200) throw new Error("msg " + r.status);
  const id = (await j(r)).message.id as string;
  franking.set(id, { text: body, frankingKey });
  return id;
}

describe("گزارش‌ها — ثبت توسطِ کاربر", () => {
  it("فقط با دسترسیِ مشروع؛ تکراری ۴۰۹؛ خود/پیامِ خود/پیش‌نویسِ ارسال‌نشده ۴۰۴", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    const mMsg = await sendMsg(m, ms, "پیام منتور");
    const sMsg = await sendMsg(s, ms, "پیام شاگرد");
    const stranger = await makeUser();

    expect((await report(stranger, { targetType: "MESSAGE", targetId: mMsg, reason: "x" })).status).toBe(404);
    expect((await report(s, { targetType: "MESSAGE", targetId: sMsg, reason: "x" })).status).toBe(404);
    expect((await report(s, { targetType: "USER", targetId: s, reason: "x" })).status).toBe(404);
    expect((await report(s, { targetType: "USER", targetId: stranger, reason: "x" })).status).toBe(404);
    expect((await report(s, { targetType: "MESSAGE", targetId: mMsg, reason: "" })).status).toBe(400);
    expect((await report(s, { targetType: "NOPE", targetId: mMsg, reason: "x" })).status).toBe(400);

    const ok = await report(s, { targetType: "MESSAGE", targetId: mMsg, reason: "توهین" });
    expect(ok.status).toBe(200);
    expect((await report(s, { targetType: "MESSAGE", targetId: mMsg, reason: "توهین" })).status).toBe(409);
    // منتورِ عمومی را هرکسی می‌تواند گزارش کند
    expect((await report(stranger, { targetType: "USER", targetId: m, reason: "x" })).status).toBe(200);

    const { POST: postProg } = await import("@/app/api/mentor-programs/route");
    as(m);
    const draft = (await j(await postProg(req("POST", "/x", { mentorshipId: ms, type: "ROUTINE", title: "d", items: [] })))).program.id;
    expect((await report(s, { targetType: "PROGRAM", targetId: draft, reason: "x" })).status).toBe(404);
    expect((await report(stranger, { targetType: "PROGRAM", targetId: draft, reason: "x" })).status).toBe(404);
  });
});

describe("گزارش‌ها — رسیدگیِ ادمین", () => {
  it("hide_review از طریقِ گزارش: نظر پنهان و میانگین بازمحاسبه؛ دوباره ۴۰۹", async () => {
    const t = await mentorTarget();
    const r = await report(t.userId, { targetType: "REVIEW", targetId: t.reviewId, reason: "نظرِ جعلی" });
    expect(r.status).toBe(200);
    const reportId = (await j(r)).report.id;
    const admin = await makeUser({ adminPermissions: ["mentors"] });
    expect((await resolve(admin, reportId, { status: "DISMISSED", action: "hide_review" })).status).toBe(400);
    expect((await resolve(admin, reportId, { status: "RESOLVED", action: "delete_message" })).status).toBe(400);
    expect((await resolve(admin, reportId, { status: "RESOLVED", action: "hide_review", resolution: "ok" })).status).toBe(200);
    expect((await prisma.mentorReview.findUnique({ where: { id: t.reviewId } }))!.status).toBe("HIDDEN");
    expect((await prisma.mentorProfile.findUnique({ where: { userId: t.userId } }))!.ratingCount).toBe(0);
    expect((await resolve(admin, reportId, { status: "RESOLVED" })).status).toBe(409);
  });

  it("suspend_mentor از طریقِ گزارش روی Owner برای ادمینِ محدود ۴۰۳ است", async () => {
    const owner = await mentorTarget({ owner: true });
    const s = await makeUser();
    await connect(s, owner.userId);
    const rid = (await j(await report(s, { targetType: "USER", targetId: owner.userId, reason: "x" }))).report.id;
    const admin = await makeUser({ adminPermissions: ["mentors"] });
    expect((await resolve(admin, rid, { status: "RESOLVED", action: "suspend_mentor" })).status).toBe(403);
    expect((await prisma.mentorProfile.findUnique({ where: { userId: owner.userId } }))!.suspendedAt).toBeNull();
  });

  // باگ: روتِ PATCH /api/admin/mentors/reports/[id] برای hide_review و suspend_mentor
  // loadTarget (قوانینِ «کی روی کی») را اجرا می‌کند ولی برای delete_message نه.
  // نتیجه: ادمینِ محدودی که خودش منتور است می‌تواند پیامِ آزارندهٔ *خودش* را که
  // شاگرد گزارش کرده حذف کند (پاک‌کردنِ مدرک علیهِ خود)، یا پیامِ Owner را حذف کند.
  it("delete_message روی پیامِ خودِ ادمینِ محدود باید رد شود (۴۰۰) — تضادِ منافع", async () => {
    const adminMentor = await makeMentor({ adminPermissions: ["mentors"] });
    const s = await makeUser();
    const ms = await connect(s, adminMentor);
    const msg = await sendMsg(adminMentor, ms, "پیامِ آزارنده");
    const rid = (await j(await report(s, { targetType: "MESSAGE", targetId: msg, reason: "آزار" }))).report.id;

    const res = await resolve(adminMentor, rid, { status: "RESOLVED", action: "delete_message" });
    expect(res.status).toBe(400);
    expect(await prisma.mentorMessage.count({ where: { id: msg } })).toBe(1);
  });

  it("delete_message روی پیامِ Owner توسطِ ادمینِ محدود باید ۴۰۳ باشد", async () => {
    const owner = await mentorTarget({ owner: true });
    const s = await makeUser();
    const ms = await connect(s, owner.userId);
    const msg = await sendMsg(owner.userId, ms, "پیام Owner");
    const rid = (await j(await report(s, { targetType: "MESSAGE", targetId: msg, reason: "x" }))).report.id;
    const admin = await makeUser({ adminPermissions: ["mentors"] });

    const res = await resolve(admin, rid, { status: "RESOLVED", action: "delete_message" });
    expect(res.status).toBe(403);
    expect(await prisma.mentorMessage.count({ where: { id: msg } })).toBe(1);
  });
});
