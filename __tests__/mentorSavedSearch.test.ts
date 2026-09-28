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
import { GET as discover } from "@/app/api/mentors/route";
import { GET as mentorProfile } from "@/app/api/mentors/[mentorId]/route";
import { GET as listSaved } from "@/app/api/mentors/saved/route";
import { PUT as putSaved, DELETE as deleteSaved } from "@/app/api/mentors/[mentorId]/saved/route";
import { POST as postMentorship } from "@/app/api/mentorships/route";
import { SAVED_MENTORS_MAX } from "@/lib/savedMentors";
import { MENTOR_TERMS_VERSION } from "@/lib/mentorTerms";
import { as, req, j, makeUser, makeMentor, makeMentorProfile, cleanupUsers, requestMentorship, mentorshipAction, uniqueTag } from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const save = (viewer: string, mentorId: string) => { as(viewer); return putSaved(req("PUT", `/api/mentors/${mentorId}/saved`), { params: { mentorId } }); };
const unsave = (viewer: string, mentorId: string) => { as(viewer); return deleteSaved(req("DELETE", `/api/mentors/${mentorId}/saved`), { params: { mentorId } }); };
const saved = async (viewer: string) => { as(viewer); return j(await listSaved()); };
const search = async (viewer: string, qs: string) => { as(viewer); const r = await discover(req("GET", `/api/mentors?${qs}`)); expect(r.status).toBe(200); return (await j(r)).mentors.map((c: any) => c.userId) as string[]; };

describe("احرازِ هویتِ اجباریِ منتور", () => {
  it("منتورِ بدونِ هویتِ تأییدشده در جستجو و پروفایلِ عمومی دیده نمی‌شود", async () => {
    const tag = uniqueTag();
    const verified = await makeMentor({ username: `${tag}v`.slice(0, 20) });
    const pending = await makeMentor({ username: `${tag}p`.slice(0, 20) }, undefined, { identity: false });
    await prisma.mentorProfile.update({ where: { userId: pending }, data: { identityStatus: "PENDING" } });
    const viewer = await makeUser();
    expect(await search(viewer, `q=${tag}&sort=new`)).toEqual([verified]);
    as(viewer);
    expect((await mentorProfile(req("GET", `/api/mentors/${pending}`), { params: { mentorId: pending } })).status).toBe(404);
    expect((await mentorProfile(req("GET", `/api/mentors/${verified}`), { params: { mentorId: verified } })).status).toBe(200);
  });

  it("درخواستِ شاگرد به منتورِ تأییدنشده ۴۰۴؛ دعوتِ منتورِ تأییدنشده ۴۰۳", async () => {
    const m = await makeMentor({}, undefined, { identity: false });
    const s = await makeUser({ username: `st${uniqueTag()}`.slice(0, 20) });
    expect((await requestMentorship(s, m)).status).toBe(404);
    as(m);
    const student = await prisma.user.findUnique({ where: { id: s }, select: { username: true } });
    const inv = await postMentorship(req("POST", "/api/mentorships", { studentUsername: student!.username }));
    expect(inv.status).toBe(403);
  });

  it("اگر هویت پس از درخواست لغو شد، پذیرشِ درخواست ۴۰۳ است", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const r = await requestMentorship(s, m);
    expect(r.status).toBe(200);
    const id = (await j(r)).mentorship.id;
    await prisma.mentorProfile.update({ where: { userId: m }, data: { identityStatus: "REJECTED" } });
    expect((await mentorshipAction(m, id, "accept")).status).toBe(403);
  });
});

describe("منتورهای ذخیره‌شده", () => {
  it("ذخیره/برداشتن بی‌اثر در تکرار، فهرست و فلگِ پروفایل", async () => {
    const m = await makeMentor();
    const v = await makeUser();
    const a = await save(v, m);
    expect(a.status).toBe(200);
    expect(await j(a)).toMatchObject({ saved: true, count: 1, max: SAVED_MENTORS_MAX });
    expect((await j(await save(v, m))).count).toBe(1);
    const list = await saved(v);
    expect(list.mentors.map((c: any) => c.userId)).toEqual([m]);
    as(v);
    expect((await j(await mentorProfile(req("GET", `/api/mentors/${m}`), { params: { mentorId: m } }))).saved).toBe(true);
    const d = await unsave(v, m);
    expect(await j(d)).toMatchObject({ saved: false, count: 0 });
    expect((await saved(v)).mentors).toEqual([]);
  });

  it(`سقفِ ${SAVED_MENTORS_MAX} سمتِ سرور با پیامِ روشن`, async () => {
    const v = await makeUser();
    const mentors: string[] = [];
    for (let i = 0; i <= SAVED_MENTORS_MAX; i++) mentors.push(await makeMentor());
    for (let i = 0; i < SAVED_MENTORS_MAX; i++) expect((await save(v, mentors[i])).status).toBe(200);
    const over = await save(v, mentors[SAVED_MENTORS_MAX]);
    expect(over.status).toBe(409);
    expect((await j(over)).error).toContain("حداکثر");
    expect(await prisma.savedMentor.count({ where: { userId: v } })).toBe(SAVED_MENTORS_MAX);
    // درخواست‌های هم‌زمان هم از سقف رد نمی‌شوند
    await unsave(v, mentors[0]);
    const extra = [mentors[SAVED_MENTORS_MAX], mentors[0]];
    const results = await Promise.all(extra.map((m) => save(v, m)));
    // هر کدام یا ذخیره می‌شود یا ۴۰۹ (در مسابقه ممکن است هر دو کنار بروند)؛ هرگز بیش از سقف
    expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(true);
    expect(await prisma.savedMentor.count({ where: { userId: v } })).toBeLessThanOrEqual(SAVED_MENTORS_MAX);
  });

  it("ذخیره‌ای که منتورش دیگر قابلِ کشف نیست جای سقف را نمی‌گیرد و نمایش داده نمی‌شود", async () => {
    const v = await makeUser();
    const m1 = await makeMentor();
    const m2 = await makeMentor();
    await save(v, m1);
    await save(v, m2);
    await prisma.mentorProfile.update({ where: { userId: m2 }, data: { suspendedAt: new Date() } });
    const list = await saved(v);
    expect(list.mentors.map((c: any) => c.userId)).toEqual([m1]);
  });

  it("ضدِ IDOR و ورودیِ نامعتبر: خودت ۴۰۰، ناموجود/تأییدنشده ۴۰۴، ناشناس ۴۰۱، ذخیره‌ی دیگران دیده نمی‌شود", async () => {
    const me = await makeMentor();
    expect((await save(me, me)).status).toBe(400);
    expect((await save(me, "nonexistent-id")).status).toBe(404);
    const unverified = await makeMentor({}, undefined, { identity: false });
    expect((await save(me, unverified)).status).toBe(404);
    as(null);
    expect((await listSaved()).status).toBe(401);

    const other = await makeUser();
    const m = await makeMentor();
    await save(other, m);
    expect((await saved(me)).mentors.map((c: any) => c.userId)).not.toContain(m);
    // برداشتنِ من روی ذخیره‌ی دیگری اثری ندارد
    await unsave(me, m);
    expect(await prisma.savedMentor.count({ where: { userId: other, mentorUserId: m } })).toBe(1);
  });
});

describe("جستجوی هوشمند و فیلترها (روت)", () => {
  it("غلطِ املایی و هم‌معنی پیدا می‌کنند؛ عبارتِ بی‌ربط هیچ", async () => {
    const tag = uniqueTag();
    const konkur = await makeMentor({ username: `${tag}k`.slice(0, 20), name: `کنکوری${tag}` }, {
      headline: `برنامه‌ریزی کنکور ${tag}`, bio: "مشاور تحصیلی", categories: ["ROUTINE"], published: true, specialties: ["آزمون آزمایشی"],
    });
    const gym = await makeMentor({ username: `${tag}g`.slice(0, 20) }, {
      headline: `مربی بدنسازی ${tag}`, bio: "مربی باشگاه", categories: ["FITNESS"], published: true,
    });
    const v = await makeUser();
    for (const q of ["کنکر", "كنكور", "کنگور", "konkur", "آزمون سراسری"]) {
      const ids = await search(v, `q=${encodeURIComponent(`${q} ${tag}`)}`);
      expect(ids, q).toContain(konkur);
      expect(ids, q).not.toContain(gym);
    }
    const g = await search(v, `q=${encodeURIComponent(`فیتنس ${tag}`)}`);
    expect(g).toEqual([gym]);
    expect(await search(v, `q=${encodeURIComponent(`آشپزی ${tag}`)}`)).toEqual([]);
  });

  it("فیلترهای مدرک، پذیرش، امتیاز و زمانِ پاسخ", async () => {
    const tag = uniqueTag();
    const base = { bio: "b", categories: ["FITNESS"], published: true };
    const certified = await makeMentor({ username: `${tag}c`.slice(0, 20) }, { ...base, headline: `h ${tag}` });
    await prisma.mentorCredential.updateMany({ where: { profile: { userId: certified }, category: "FITNESS" }, data: { status: "VERIFIED" } });
    const closed = await makeMentor({ username: `${tag}x`.slice(0, 20) }, { ...base, headline: `h ${tag}` });
    await prisma.mentorProfile.update({ where: { userId: closed }, data: { acceptingStudents: false, ratingAvg: 4.8, ratingCount: 3, responseTimeHours: 12 } });
    const full = await makeMentor({ username: `${tag}f`.slice(0, 20) }, { ...base, headline: `h ${tag}` });
    await prisma.mentorProfile.update({ where: { userId: full }, data: { maxActiveStudents: 0 } });
    const v = await makeUser();
    const q = `q=${tag}&sort=new`;
    expect(await search(v, `${q}&cert=1`)).toEqual([certified]);
    expect(await search(v, `${q}&cert=1&cat=ROUTINE`)).toEqual([]);
    const open = await search(v, `${q}&open=1`);
    expect(open).toContain(certified);
    expect(open).not.toContain(closed);
    expect(open).not.toContain(full);
    expect(await search(v, `${q}&rating=4.5`)).toEqual([closed]);
    expect(await search(v, `${q}&resp=24`)).toEqual([closed]);
    // بدونِ عبارت و با پذیرشِ باز (مسیرِ حافظه‌ای بدونِ q) هم ظرفیتِ پر حذف می‌شود
    const noQ = await search(v, `open=1&sort=new&cat=FITNESS`);
    expect(noQ).not.toContain(full);
    expect(noQ).not.toContain(closed);
  });
});

// helper sanity: makeMentorProfile هنوز پروفایلِ تأییدنشده می‌سازد
describe("helper", () => {
  it("makeMentorProfile هویت را تأیید نمی‌کند", async () => {
    const u = await makeUser();
    const p = await makeMentorProfile(u);
    expect(p.identityStatus).toBe("NOT_PROVIDED");
    expect(MENTOR_TERMS_VERSION).toBeTruthy();
  });
});
