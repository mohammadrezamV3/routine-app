import { describe, it, expect, afterAll, vi } from "vitest";

// ── mockها: فقط نشست و پوش. گیت‌های واقعی (requireFeature/فلگ‌ها/مسدودی) اجرا می‌شوند.
vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

import { prisma } from "@/lib/prisma";
import { GET as listMentorships, POST as postMentorship } from "@/app/api/mentorships/route";
import { GET as discover } from "@/app/api/mentors/route";
import {
  as,
  req,
  j,
  makeUser,
  makeMentor,
  cleanupUsers,
  requestMentorship,
  mentorshipAction,
  connect,
  activeProgram,
  createProgramId,
  transition,
  setOccurrences,
  readOccurrences,
  setPrivacy,
  uniqueTag,
} from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

async function invite(mentorId: string, studentUsername: string) {
  as(mentorId);
  return postMentorship(req("POST", "/api/mentorships", { studentUsername }));
}

describe("رابطه — احراز هویت", () => {
  it("کاربرِ ناشناس ۴۰۱ می‌گیرد", async () => {
    as(null);
    expect((await listMentorships(req("GET", "/api/mentorships"))).status).toBe(401);
    expect((await postMentorship(req("POST", "/api/mentorships", { mentorId: "x" }))).status).toBe(401);
    expect((await mentorshipAction(null as any, "abc", "accept")).status).toBe(401);
  });

  it("کاربرِ مسدودشده (isBlocked) ۴۰۳ می‌گیرد", async () => {
    const u = await makeUser();
    await prisma.user.update({ where: { id: u }, data: { isBlocked: true } });
    as(u);
    expect((await listMentorships(req("GET", "/api/mentorships"))).status).toBe(403);
  });
});

describe("رابطه — درخواست/قبول/رد/لغو", () => {
  it("درخواست به خود ۴۰۰؛ منتورِ ناموجود ۴۰۴", async () => {
    const m = await makeMentor();
    const r = await requestMentorship(m, m);
    expect(r.status).toBe(400);
    const s = await makeUser();
    expect((await requestMentorship(s, "nonexistent-id")).status).toBe(404);
  });

  it("درخواست → PENDING، تکراری ۴۰۹، فقط طرفِ غیرِ initiator قبول می‌کند", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const r = await requestMentorship(s, m, "سلام");
    expect(r.status).toBe(200);
    const ms = (await j(r)).mentorship;
    expect(ms.status).toBe("PENDING");
    expect(ms.initiatedBy).toBe("STUDENT");
    expect(ms.counterpart.id).toBe(m);
    // پاسخ اطلاعاتِ حساسِ کاربر ندارد
    expect(JSON.stringify(ms)).not.toMatch(/email|phone|passwordHash/);

    expect((await requestMentorship(s, m)).status).toBe(409);

    // خودِ فرستنده نمی‌تواند قبول/رد کند
    expect((await mentorshipAction(s, ms.id, "accept")).status).toBe(403);
    expect((await mentorshipAction(s, ms.id, "reject")).status).toBe(403);
    // غریبه ۴۰۴
    const stranger = await makeUser();
    expect((await mentorshipAction(stranger, ms.id, "accept")).status).toBe(404);

    const a = await mentorshipAction(m, ms.id, "accept");
    expect(a.status).toBe(200);
    expect((await j(a)).mentorship.status).toBe("ACTIVE");
    // درخواستِ دوباره روی ACTIVE → ۴۰۹
    expect((await requestMentorship(s, m)).status).toBe(409);
    // accept دوباره → ۴۰۹
    expect((await mentorshipAction(m, ms.id, "accept")).status).toBe(409);

    // منتور اعلانِ درخواست گرفت، شاگرد اعلانِ پذیرش
    expect(await prisma.inAppNotification.count({ where: { userId: m, type: "mentor.request" } })).toBe(1);
    expect(await prisma.inAppNotification.count({ where: { userId: s, type: "mentor.accepted" } })).toBe(1);
  });

  it("لیستِ رابطه‌ها به تفکیکِ نقش", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);
    as(s);
    const asStudent = await j(await listMentorships(req("GET", "/api/mentorships?role=student")));
    expect(asStudent.mentorships.map((x: any) => x.id)).toContain(id);
    const asStudentMentorRole = await j(await listMentorships(req("GET", "/api/mentorships?role=mentor")));
    expect(asStudentMentorRole.mentorships.map((x: any) => x.id)).not.toContain(id);
    as(m);
    const asMentor = await j(await listMentorships(req("GET", "/api/mentorships?role=mentor")));
    expect(asMentor.mentorships.find((x: any) => x.id === id).counterpart.id).toBe(s);
  });

  it("رد → REJECTED؛ درخواستِ دوباره از همان طرف در ۷ روز ۴۰۹، بعد از ۷ روز مجاز و حریم خصوصی ریست", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const r = await requestMentorship(s, m);
    const id = (await j(r)).mentorship.id;
    const rej = await mentorshipAction(m, id, "reject");
    expect(rej.status).toBe(200);
    expect((await j(rej)).mentorship.status).toBe("REJECTED");
    expect(await prisma.inAppNotification.count({ where: { userId: s, type: "mentor.rejected" } })).toBe(1);

    // cooldown
    expect((await requestMentorship(s, m)).status).toBe(409);

    // حریم خصوصیِ دستی روی ردیف (شبیه‌سازیِ رابطه‌ی قبلی) — باید با درخواستِ تازه ریست شود
    await prisma.mentorship.update({
      where: { id },
      data: { shareAllPrograms: true, showTaskName: true, updatedAt: new Date(Date.now() - 8 * 86_400_000) },
    });
    const again = await requestMentorship(s, m);
    expect(again.status).toBe(200);
    expect((await j(again)).mentorship.id).toBe(id);
    const row = await prisma.mentorship.findUnique({ where: { id } });
    expect(row!.status).toBe("PENDING");
    expect(row!.shareAllPrograms).toBe(false);
    expect(row!.showTaskName).toBe(false);
    expect(row!.sharedPrograms).toEqual([]);
  });

  it("cooldown فقط برای همان initiator است: بعد از ردِ درخواستِ شاگرد، منتور می‌تواند دعوت کند", async () => {
    const m = await makeMentor();
    const sUsername = `s_${uniqueTag()}`.slice(0, 20);
    const s = await makeUser({ username: sUsername });
    const id = (await j(await requestMentorship(s, m))).mentorship.id;
    expect((await mentorshipAction(m, id, "reject")).status).toBe(200);
    const inv = await invite(m, sUsername);
    expect(inv.status).toBe(200);
    expect((await j(inv)).mentorship.initiatedBy).toBe("MENTOR");
    // حالا شاگرد (غیرِ initiator) قبول می‌کند، منتور نمی‌تواند
    expect((await mentorshipAction(m, id, "accept")).status).toBe(403);
    expect((await mentorshipAction(s, id, "accept")).status).toBe(200);
  });

  it("cancel فقط توسطِ initiator و فقط از PENDING", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = (await j(await requestMentorship(s, m))).mentorship.id;
    expect((await mentorshipAction(m, id, "cancel")).status).toBe(403);
    const c = await mentorshipAction(s, id, "cancel");
    expect(c.status).toBe(200);
    expect((await j(c)).mentorship.status).toBe("ENDED");
    expect((await mentorshipAction(s, id, "cancel")).status).toBe(409);
    // ENDED → می‌شود دوباره درخواست داد (cooldown فقط برای REJECTED)
    expect((await requestMentorship(s, m)).status).toBe(200);
  });

  it("اقدامِ نامعتبر ۴۰۰", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = (await j(await requestMentorship(s, m))).mentorship.id;
    expect((await mentorshipAction(m, id, "__proto__")).status).toBe(400);
    expect((await mentorshipAction(m, id, "delete")).status).toBe(400);
  });

  it("منتورِ تعلیق‌شده: درخواستِ جدید ۴۰۴، قبولِ درخواستِ قبلی ۴۰۳، دعوت ۴۰۳", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = (await j(await requestMentorship(s, m))).mentorship.id;
    await prisma.mentorProfile.update({ where: { userId: m }, data: { suspendedAt: new Date() } });
    expect((await mentorshipAction(m, id, "accept")).status).toBe(403);
    expect((await requestMentorship(await makeUser(), m)).status).toBe(404);
    const uname = `sp_${uniqueTag()}`.slice(0, 20);
    await makeUser({ username: uname });
    expect((await invite(m, uname)).status).toBe(403);
    // رد همچنان ممکن است
    expect((await mentorshipAction(m, id, "reject")).status).toBe(200);
  });

  it("منتورِ منتشرنشده یا بدونِ پذیرش: ۴۰۴ / ۴۰۹", async () => {
    const hidden = await makeMentor({}, { headline: "x", bio: "b", categories: ["FITNESS"], published: false });
    const closed = await makeMentor({}, { headline: "x", bio: "b", categories: ["FITNESS"], published: true, acceptingStudents: false });
    const s = await makeUser();
    expect((await requestMentorship(s, hidden)).status).toBe(404);
    expect((await requestMentorship(s, closed)).status).toBe(409);
  });
});

describe("رابطه — end/block/unblock", () => {
  it("end: برنامه‌های باز لغو و آینه‌ی روتین حذف می‌شود؛ روتینِ خودِ شاگرد دست نمی‌خورد", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);
    await setOccurrences(s, [{ id: "own1", name: "کار شخصی", jsDay: 1, time: "10:00", tag: "شخصی" }]);

    const activeId = await activeProgram(m, s, id, { title: "برنامه فعال" });
    const pendingId = await createProgramId(m, id, { title: "برنامه در انتظار" });
    expect((await transition(m, pendingId, "send")).status).toBe(200);
    const draftId = await createProgramId(m, id, { title: "پیش‌نویس" });

    const before = await readOccurrences(s);
    expect(before.some((o) => o.mentorProgramId === activeId)).toBe(true);
    expect(before.find((o) => o.mentorProgramId === activeId).tag).toBe("برنامه فعال");

    // غریبه نمی‌تواند end کند
    const stranger = await makeUser();
    expect((await mentorshipAction(stranger, id, "end")).status).toBe(404);

    const e = await mentorshipAction(s, id, "end");
    expect(e.status).toBe(200);
    expect((await j(e)).mentorship.status).toBe("ENDED");

    const progs = await prisma.mentorProgram.findMany({ where: { mentorshipId: id }, select: { id: true, status: true } });
    const st = Object.fromEntries(progs.map((p) => [p.id, p.status]));
    expect(st[activeId]).toBe("CANCELLED");
    expect(st[pendingId]).toBe("CANCELLED");
    expect(st[draftId]).toBe("DRAFT");

    const after = await readOccurrences(s);
    expect(after.some((o) => o.mentorProgramId)).toBe(false);
    expect(after.map((o) => o.id)).toEqual(["own1"]);
    expect(await prisma.inAppNotification.count({ where: { userId: m, type: "mentor.ended" } })).toBe(1);

    // end دوباره → ۴۰۹
    expect((await mentorshipAction(m, id, "end")).status).toBe(409);
  });

  it("block: برنامه‌ها لغو؛ درخواستِ دوباره ۴۰۳ پیامِ عمومی؛ فقط blocker رفعِ بلاک می‌کند (طرفِ دیگر ۴۰۴)", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);
    const pid = await activeProgram(m, s, id);
    const b = await mentorshipAction(m, id, "block");
    expect(b.status).toBe(200);
    expect((await j(b)).mentorship.status).toBe("BLOCKED");
    expect((await prisma.mentorProgram.findUnique({ where: { id: pid } }))!.status).toBe("CANCELLED");
    expect((await readOccurrences(s)).some((o) => o.mentorProgramId === pid)).toBe(false);

    expect((await mentorshipAction(m, id, "block")).status).toBe(409);
    // شاگرد نمی‌تواند دوباره درخواست بدهد
    const again = await requestMentorship(s, m);
    expect(again.status).toBe(403);
    // شاگرد نمی‌تواند unblock کند
    expect((await mentorshipAction(s, id, "unblock")).status).toBe(404);
    const u = await mentorshipAction(m, id, "unblock");
    expect(u.status).toBe(200);
    expect((await j(u)).mentorship.status).toBe("ENDED");
    expect((await mentorshipAction(m, id, "unblock")).status).toBe(409);
  });

  it("block روی PENDING هم کار می‌کند", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = (await j(await requestMentorship(s, m))).mentorship.id;
    expect((await mentorshipAction(m, id, "block")).status).toBe(200);
    expect((await prisma.mentorship.findUnique({ where: { id } }))!.blockedById).toBe(m);
  });
});

describe("دعوت با یوزرنیم", () => {
  it("منتور شاگرد را با یوزرنیم دعوت می‌کند (@ و بزرگ/کوچکی نادیده)", async () => {
    const m = await makeMentor();
    const uname = `Inv_${uniqueTag()}`.slice(0, 20);
    const s = await makeUser({ username: uname });
    const r = await invite(m, "@" + uname.toUpperCase());
    expect(r.status).toBe(200);
    const ms = (await j(r)).mentorship;
    expect(ms.initiatedBy).toBe("MENTOR");
    expect(ms.counterpart.id).toBe(s);
    expect(await prisma.inAppNotification.count({ where: { userId: s, type: "mentor.request" } })).toBe(1);
  });

  it("کاربرِ غیرِ منتور نمی‌تواند دعوت کند (۴۰۳)", async () => {
    const notMentor = await makeUser();
    const uname = `x_${uniqueTag()}`.slice(0, 20);
    await makeUser({ username: uname });
    expect((await invite(notMentor, uname)).status).toBe(403);
  });

  it("دعوتِ خود ۴۰۰؛ یوزرنیمِ نامعتبر ۴۰۰", async () => {
    const uname = `me_${uniqueTag()}`.slice(0, 20);
    const m = await makeMentor({ username: uname });
    expect((await invite(m, uname)).status).toBe(400);
    expect((await invite(m, "a b<script>")).status).toBe(400);
  });

  it("ناموجود، کاربرِ مسدودشده، UserBlock و رابطه‌ی BLOCKED همه پاسخِ ۴۰۴ِ یکسان دارند (ضد کاوش)", async () => {
    const m = await makeMentor();

    const unknown = await invite(m, `nouser_${uniqueTag()}`.slice(0, 20));

    const bu = `bl_${uniqueTag()}`.slice(0, 20);
    const banned = await makeUser({ username: bu });
    await prisma.user.update({ where: { id: banned }, data: { isBlocked: true } });
    const bannedRes = await invite(m, bu);

    const ub = `ub_${uniqueTag()}`.slice(0, 20);
    const blocker = await makeUser({ username: ub });
    await prisma.userBlock.create({ data: { blockerId: blocker, blockedId: m } });
    const userBlockRes = await invite(m, ub);

    const rb = `rb_${uniqueTag()}`.slice(0, 20);
    const relBlocked = await makeUser({ username: rb });
    await prisma.mentorship.create({ data: { mentorId: m, studentId: relBlocked, initiatedBy: "STUDENT", status: "BLOCKED", blockedById: relBlocked } });
    const relBlockedRes = await invite(m, rb);

    const bodies = await Promise.all([unknown, bannedRes, userBlockRes, relBlockedRes].map((r) => j(r)));
    for (const r of [unknown, bannedRes, userBlockRes, relBlockedRes]) expect(r.status).toBe(404);
    for (const b of bodies) expect(b).toEqual(bodies[0]);
  });

  it("درخواستِ شاگرد به منتوری که UserBlock دارد → ۴۰۳ با پیامِ عمومی", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    await prisma.userBlock.create({ data: { blockerId: m, blockedId: s } });
    const r = await requestMentorship(s, m);
    expect(r.status).toBe(403);
    expect((await j(r)).error).toContain("امکان ارسال درخواست");
  });
});

describe("کشفِ منتور", () => {
  it("جست‌وجو با q پیدا می‌کند؛ منتشرنشده/معلق/مسدود/بلاک‌شده دیده نمی‌شوند", async () => {
    const tag = uniqueTag();
    const visible = await makeMentor({ username: `${tag}a`.slice(0, 20), name: "نمایان" });
    const unpublished = await makeMentor({ username: `${tag}b`.slice(0, 20) }, { headline: "h", bio: "b", categories: ["FITNESS"], published: false });
    const suspended = await makeMentor({ username: `${tag}c`.slice(0, 20) });
    await prisma.mentorProfile.update({ where: { userId: suspended }, data: { suspendedAt: new Date() } });
    const bannedM = await makeMentor({ username: `${tag}d`.slice(0, 20) });
    await prisma.user.update({ where: { id: bannedM }, data: { isBlocked: true } });
    const blockedM = await makeMentor({ username: `${tag}e`.slice(0, 20) });
    const viewer = await makeUser();
    await prisma.userBlock.create({ data: { blockerId: viewer, blockedId: blockedM } });

    as(viewer);
    for (const sort of ["popular", "rating", "new"]) {
      const r = await discover(req("GET", `/api/mentors?q=${tag}&sort=${sort}`));
      expect(r.status).toBe(200);
      const ids = (await j(r)).mentors.map((c: any) => c.userId);
      expect(ids).toEqual([visible]);
    }
    const card = (await j(await discover(req("GET", `/api/mentors?q=${tag}`)))).mentors[0];
    expect(Object.keys(card).sort()).toEqual(
      ["acceptingStudents", "activeStudents", "avatarUrl", "categories", "certifications", "headline", "identityVerified", "name", "ratingAvg", "ratingCount", "totalStudents", "userId"].sort()
    );
    expect(unpublished && suspended).toBeTruthy();
  });

  it("کشف rate limit دارد (۶۰ در دقیقه → ۴۲۹)", async () => {
    const viewer = await makeUser();
    as(viewer);
    const q = `zz${uniqueTag()}`;
    let last = 0;
    for (let i = 0; i < 61; i++) last = (await discover(req("GET", `/api/mentors?q=${q}&sort=new`))).status;
    expect(last).toBe(429);
  });

  it("کشف برای ناشناس ۴۰۱", async () => {
    as(null);
    expect((await discover(req("GET", "/api/mentors"))).status).toBe(401);
  });

  it("setPrivacy روی رابطه‌ی دیگران ۴۰۴ (helper sanity)", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);
    expect((await setPrivacy(m, id, { shareAllPrograms: true })).status).toBe(404);
  });
});
