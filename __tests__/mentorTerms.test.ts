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
import {
  MENTOR_TERMS_VERSION,
  MENTOR_TERMS_ERROR_CODE,
  MENTOR_TERMS_STALE_MESSAGE,
  decideMentorTerms,
} from "@/lib/mentorTerms";
import { PUT as putMe, GET as getMe } from "@/app/api/mentors/me/route";
import { POST as postMentorship } from "@/app/api/mentorships/route";
import { GET as getTermsStatus } from "@/app/api/mentor-terms/route";
import { as, req, j, makeUser, makeMentor, cleanupUsers, mentorshipAction } from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const PROFILE = { headline: "مربی", bio: "بیو", categories: ["FITNESS"], published: true };

/** منتور قابل درخواست: منتشرشده + هویت تاییدشده (احراز هویت برای کشف/درخواست اجباری است) */
async function verifiedMentor(): Promise<string> {
  const id = await makeMentor({}, PROFILE);
  await prisma.mentorProfile.update({ where: { userId: id }, data: { identityStatus: "VERIFIED" } });
  return id;
}

describe("decideMentorTerms (منطق خالص)", () => {
  it("فقط رشته‌ی دقیق نسخه‌ی جاری پذیرش است؛ true یا نسخه‌ی کهنه نه", () => {
    expect(decideMentorTerms("mentor", null, MENTOR_TERMS_VERSION)).toEqual({ ok: true, record: true });
    expect(decideMentorTerms("mentor", MENTOR_TERMS_VERSION, MENTOR_TERMS_VERSION)).toEqual({ ok: true, record: false });
    expect(decideMentorTerms("mentor", MENTOR_TERMS_VERSION, undefined)).toEqual({ ok: true, record: false });
    expect(decideMentorTerms("mentor", null, true).ok).toBe(false);
    expect(decideMentorTerms("student", null, undefined).ok).toBe(false);
    expect(decideMentorTerms("student", "2000-01-01", undefined).ok).toBe(false);
    const stale = decideMentorTerms("student", null, "2000-01-01");
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.message).toBe(MENTOR_TERMS_STALE_MESSAGE);
  });
});

describe("PUT /api/mentors/me — پذیرش شرایط منتوری", () => {
  it("ساخت پروفایل بدون پذیرش ۴۰۰ با code و هیچ پروفایلی ساخته نمی‌شود", async () => {
    const u = await makeUser();
    as(u);
    for (const acceptMentorTerms of [undefined, true, "yes", "2000-01-01"]) {
      const r = await putMe(req("PUT", "/api/mentors/me", { ...PROFILE, acceptMentorTerms }));
      expect(r.status).toBe(400);
      const body = await j(r);
      expect(body.code).toBe(MENTOR_TERMS_ERROR_CODE);
      expect(typeof body.error).toBe("string");
    }
    expect(await prisma.mentorProfile.count({ where: { userId: u } })).toBe(0);
  });

  it("با پذیرش ساخته می‌شود و زمان و نسخه ثبت و در GET برگردانده می‌شود؛ ویرایش بعدی بدون ارسال دوباره آزاد است", async () => {
    const u = await makeUser();
    as(u);
    const before = Date.now();
    const r = await putMe(req("PUT", "/api/mentors/me", { ...PROFILE, acceptMentorTerms: MENTOR_TERMS_VERSION }));
    expect(r.status).toBe(200);
    const row = await prisma.mentorProfile.findUnique({ where: { userId: u } });
    expect(row!.mentorTermsVersion).toBe(MENTOR_TERMS_VERSION);
    expect(row!.acceptedMentorTermsAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
    const self = (await j(await getMe())).profile;
    expect(self.mentorTermsVersion).toBe(MENTOR_TERMS_VERSION);

    const firstAt = row!.acceptedMentorTermsAt!.getTime();
    expect((await putMe(req("PUT", "/api/mentors/me", { headline: "جدید" }))).status).toBe(200);
    const again = await prisma.mentorProfile.findUnique({ where: { userId: u } });
    expect(again!.headline).toBe("جدید");
    expect(again!.acceptedMentorTermsAt!.getTime()).toBe(firstAt); // پذیرش دوباره زمان را جابه‌جا نمی‌کند
  });

  it("نسخه‌ی کهنه (یا پروفایل پیش از این قابلیت): ویرایش ۴۰۰، اما کنار کشیدن (عدم انتشار / توقف پذیرش) آزاد است", async () => {
    const m = await makeMentor({}, PROFILE);
    await prisma.mentorProfile.update({ where: { userId: m }, data: { mentorTermsVersion: null, acceptedMentorTermsAt: null } });
    as(m);
    const edit = await putMe(req("PUT", "/api/mentors/me", { bio: "بیوی تازه" }));
    expect(edit.status).toBe(400);
    expect((await j(edit)).code).toBe(MENTOR_TERMS_ERROR_CODE);
    // «کنار کشیدن» با مقدار true (انتشار دوباره) معاف نیست
    expect((await putMe(req("PUT", "/api/mentors/me", { published: true }))).status).toBe(400);
    // کنار کشیدن آزاد است
    expect((await putMe(req("PUT", "/api/mentors/me", { published: false, acceptingStudents: false }))).status).toBe(200);
    const p = await prisma.mentorProfile.findUnique({ where: { userId: m } });
    expect(p!.published).toBe(false);
    expect(p!.mentorTermsVersion).toBeNull();
    // کنار کشیدن + تغییر دیگر معاف نیست
    expect((await putMe(req("PUT", "/api/mentors/me", { published: false, bio: "x" }))).status).toBe(400);
    // پذیرش دوباره
    expect((await putMe(req("PUT", "/api/mentors/me", { published: true, acceptMentorTerms: MENTOR_TERMS_VERSION }))).status).toBe(200);
    expect((await prisma.mentorProfile.findUnique({ where: { userId: m } }))!.mentorTermsVersion).toBe(MENTOR_TERMS_VERSION);
  });
});

describe("POST /api/mentorships — پذیرش شرایط توسط شاگرد", () => {
  it("اولین درخواست بدون پذیرش ۴۰۰ و هیچ رابطه‌ای ساخته نمی‌شود؛ با پذیرش ثبت روی کاربر و snapshot روی رابطه", async () => {
    const mentor = await verifiedMentor();
    const s = await makeUser();
    as(s);
    const bad = await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor }));
    expect(bad.status).toBe(400);
    expect((await j(bad)).code).toBe(MENTOR_TERMS_ERROR_CODE);
    expect(await prisma.mentorship.count({ where: { studentId: s } })).toBe(0);

    const stale = await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor, acceptMentorTerms: "2000-01-01" }));
    expect(stale.status).toBe(400);
    expect((await j(stale)).error).toBe(MENTOR_TERMS_STALE_MESSAGE);

    const ok = await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor, acceptMentorTerms: MENTOR_TERMS_VERSION }));
    expect(ok.status).toBe(200);
    const user = await prisma.user.findUnique({ where: { id: s }, select: { mentorStudentTermsVersion: true, mentorStudentTermsAcceptedAt: true } });
    expect(user!.mentorStudentTermsVersion).toBe(MENTOR_TERMS_VERSION);
    expect(user!.mentorStudentTermsAcceptedAt).not.toBeNull();
    const rel = await prisma.mentorship.findFirst({ where: { studentId: s, mentorId: mentor } });
    expect(rel!.studentTermsVersion).toBe(MENTOR_TERMS_VERSION);

    // درخواست بعدی (منتور دیگر) بدون ارسال دوباره
    const mentor2 = await verifiedMentor();
    as(s);
    const second = await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor2 }));
    expect(second.status).toBe(200);
    expect((await prisma.mentorship.findFirst({ where: { studentId: s, mentorId: mentor2 } }))!.studentTermsVersion).toBe(MENTOR_TERMS_VERSION);
  });

  it("درخواست دوباره روی ردیف پایان‌یافته هم نسخه را snapshot و پذیرش کهنه را دوباره می‌خواهد", async () => {
    const mentor = await verifiedMentor();
    const s = await makeUser();
    as(s);
    const r = await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor, acceptMentorTerms: MENTOR_TERMS_VERSION }));
    const id = (await j(r)).mentorship.id as string;
    expect((await mentorshipAction(s, id, "cancel")).status).toBe(200);
    await prisma.user.update({ where: { id: s }, data: { mentorStudentTermsVersion: "2000-01-01" } });
    await prisma.mentorship.update({ where: { id }, data: { studentTermsVersion: null } });
    as(s);
    expect((await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor }))).status).toBe(400);
    expect((await prisma.mentorship.findUnique({ where: { id } }))!.status).toBe("ENDED");
    expect((await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor, acceptMentorTerms: MENTOR_TERMS_VERSION }))).status).toBe(200);
    expect((await prisma.mentorship.findUnique({ where: { id } }))!.studentTermsVersion).toBe(MENTOR_TERMS_VERSION);
    expect((await prisma.user.findUnique({ where: { id: s } }))!.mentorStudentTermsVersion).toBe(MENTOR_TERMS_VERSION);
  });

  it("ترتیب خطاها: منتور ناموجود همچنان ۴۰۴ است (نه خطای شرایط)", async () => {
    const s = await makeUser();
    as(s);
    expect((await postMentorship(req("POST", "/api/mentorships", { mentorId: "nope" }))).status).toBe(404);
  });
});

describe("GET /api/mentor-terms", () => {
  it("بدون نشست ۴۰۱؛ وضعیت هر دو نقش را برمی‌گرداند", async () => {
    as(null);
    expect((await getTermsStatus()).status).toBe(401);
    const u = await makeUser();
    as(u);
    let s = await j(await getTermsStatus());
    expect(s).toMatchObject({ version: MENTOR_TERMS_VERSION, student: { accepted: false }, mentor: { hasProfile: false, accepted: false } });
    const m = await verifiedMentor();
    as(u);
    await postMentorship(req("POST", "/api/mentorships", { mentorId: m, acceptMentorTerms: MENTOR_TERMS_VERSION }));
    s = await j(await getTermsStatus());
    expect(s.student.accepted).toBe(true);
    as(m);
    s = await j(await getTermsStatus());
    expect(s.mentor).toMatchObject({ hasProfile: true, accepted: true });
  });
});
