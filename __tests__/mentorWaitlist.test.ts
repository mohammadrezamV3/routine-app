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

import { MENTOR_TERMS_VERSION } from "@/lib/mentorTerms";
import { prisma } from "@/lib/prisma";
import { PUT as putSettings } from "@/app/api/mentor/settings/route";
import { GET as mentorDetail } from "@/app/api/mentors/[mentorId]/route";
import { GET as getMyWaitlist, POST as joinWaitlist, DELETE as leaveWaitlist } from "@/app/api/mentors/[mentorId]/waitlist/route";
import { GET as mentorWaitlist } from "@/app/api/mentor/waitlist/route";
import { DELETE as mentorRemove } from "@/app/api/mentor/waitlist/[entryId]/route";
import {
  WAITLIST_OFFER_BATCH,
  WAITLIST_OFFER_MS,
  canJoinWaitlist,
  freeSeats,
  isOfferLive,
  offerRemainingLabel,
  planOffers,
  queuePosition,
} from "@/lib/mentorWaitlist";
import { advanceWaitlist } from "@/lib/mentorWaitlistServer";
import { as, req, j, makeUser, makeMentor, cleanupUsers, requestMentorship, mentorshipAction, connect } from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

async function settings(mentorId: string, body: Record<string, unknown>) {
  as(mentorId);
  return putSettings(req("PUT", "/api/mentor/settings", body));
}

async function join(userId: string, mentorId: string, terms = true) {
  as(userId);
  return joinWaitlist(req("POST", `/api/mentors/${mentorId}/waitlist`, terms ? { acceptMentorTerms: MENTOR_TERMS_VERSION } : {}), { params: { mentorId } });
}

async function mine(userId: string, mentorId: string) {
  as(userId);
  return (await j(await getMyWaitlist(req("GET", `/api/mentors/${mentorId}/waitlist`), { params: { mentorId } }))).waitlist;
}

async function leave(userId: string, mentorId: string) {
  as(userId);
  return leaveWaitlist(req("DELETE", `/api/mentors/${mentorId}/waitlist`), { params: { mentorId } });
}

async function entry(mentorId: string, userId: string) {
  return prisma.mentorWaitlistEntry.findUnique({ where: { mentorId_userId: { mentorId, userId } } });
}

/** منتور پر با ظرفیت ۱ و یک شاگرد فعال → { m, s0, rel } */
async function fullMentor() {
  const m = await makeMentor();
  await settings(m, { maxActiveStudents: 1 });
  const s0 = await makeUser();
  const rel = await connect(s0, m);
  return { m, s0, rel };
}

describe("صف انتظار — منطق خالص", () => {
  it("فقط FULL صف دارد", () => {
    expect(canJoinWaitlist("FULL")).toBe(true);
    for (const s of ["OPEN", "CLOSED", "AWAY"] as const) expect(canJoinWaitlist(s)).toBe(false);
  });

  it("صندلی آزاد: رزروها کم می‌شوند؛ بدون سقف بی‌نهایت؛ منفی نه", () => {
    expect(freeSeats(3, 1, 1)).toBe(1);
    expect(freeSeats(3, 3, 1)).toBe(0);
    expect(freeSeats(null, 50, 5)).toBe(Number.POSITIVE_INFINITY);
  });

  it("planOffers: FIFO، به اندازه‌ی صندلی، و هیچ وقتی مربی پذیرا نیست", () => {
    const base = { acceptingStudents: true, discoverable: true, awayPaused: false, maxActiveStudents: 3, active: 1, reserved: 0, waiting: ["a", "b", "c"] };
    expect(planOffers(base)).toEqual(["a", "b"]);
    expect(planOffers({ ...base, reserved: 1 })).toEqual(["a"]);
    expect(planOffers({ ...base, active: 3 })).toEqual([]);
    expect(planOffers({ ...base, acceptingStudents: false })).toEqual([]);
    expect(planOffers({ ...base, discoverable: false })).toEqual([]);
    expect(planOffers({ ...base, awayPaused: true })).toEqual([]);
    const many = Array.from({ length: 50 }, (_, i) => `u${i}`);
    expect(planOffers({ ...base, maxActiveStudents: null, waiting: many })).toHaveLength(WAITLIST_OFFER_BATCH);
  });

  it("جایگاه با joinedAt و بعد id؛ نوبت زنده؛ برچسب مهلت", () => {
    const t = new Date("2026-09-28T10:00:00Z");
    const rows = [
      { id: "b", joinedAt: t },
      { id: "c", joinedAt: new Date(t.getTime() - 1000) },
      { id: "a", joinedAt: t },
    ];
    expect(queuePosition(rows, "c")).toBe(1);
    expect(queuePosition(rows, "a")).toBe(2);
    expect(queuePosition(rows, "b")).toBe(3);
    expect(queuePosition(rows, "x")).toBeNull();

    const exp = new Date(t.getTime() + WAITLIST_OFFER_MS);
    expect(isOfferLive({ status: "OFFERED", offerExpiresAt: exp }, t)).toBe(true);
    expect(isOfferLive({ status: "OFFERED", offerExpiresAt: t }, t)).toBe(false);
    expect(isOfferLive({ status: "WAITING", offerExpiresAt: exp }, t)).toBe(false);

    expect(offerRemainingLabel(exp, t)).toContain("ساعت وقت داری");
    expect(offerRemainingLabel(new Date(t.getTime() + 5 * 60_000), t)).toContain("دقیقه وقت داری");
    expect(offerRemainingLabel(t, t)).toBe("مهلتت تموم شد");
    expect(offerRemainingLabel(exp, t, true)).toContain("وقت داره");
  });
});

describe("صف انتظار — ورود، جایگاه، خروج", () => {
  it("فقط وقتی پر است؛ گیت‌های درخواست عادی (خود، شرایط، رابطه‌ی فعال) اعمال می‌شوند", async () => {
    const open = await makeMentor();
    const u = await makeUser();
    const r0 = await join(u, open);
    expect(r0.status).toBe(409);
    expect((await j(r0)).error).toContain("ظرفیت");

    const { m, s0 } = await fullMentor();
    expect((await join(m, m)).status).toBe(400);
    expect((await join(s0, m)).status).toBe(409); // شاگرد فعال

    const fresh = await makeUser();
    const noTerms = await join(fresh, m, false);
    expect(noTerms.status).toBe(400);
    expect((await j(noTerms)).code).toBe("MENTOR_TERMS_REQUIRED");

    as(null);
    expect((await getMyWaitlist(req("GET", `/api/mentors/${m}/waitlist`), { params: { mentorId: m } })).status).toBe(401);
  });

  it("FIFO: «نفر N در صف»، تکراری ۴۰۹، خروج و ورود دوباره ته صف", async () => {
    const { m } = await fullMentor();
    const a = await makeUser();
    const b = await makeUser();
    const r = await join(a, m);
    expect(r.status).toBe(200);
    expect((await j(r)).waitlist).toMatchObject({ status: "WAITING", position: 1, waiting: 1 });
    expect((await j(await join(b, m))).waitlist).toMatchObject({ status: "WAITING", position: 2, waiting: 2 });
    expect((await join(a, m)).status).toBe(409);

    // پذیرش شرایط روی کاربر ثبت شد (مثل درخواست عادی)
    const u = await prisma.user.findUnique({ where: { id: a }, select: { mentorStudentTermsVersion: true } });
    expect(u?.mentorStudentTermsVersion).toBe(MENTOR_TERMS_VERSION);

    expect((await leave(a, m)).status).toBe(200);
    expect(await mine(a, m)).toBeNull();
    expect(await mine(b, m)).toMatchObject({ position: 1 });
    expect((await join(a, m)).status).toBe(200);
    expect(await mine(a, m)).toMatchObject({ position: 2 });
    expect((await leave(await makeUser(), m)).status).toBe(404);

    // پروفایل عمومی: وضعیت من + تعداد
    as(a);
    const d = await j(await mentorDetail(req("GET", `/api/mentors/${m}`), { params: { mentorId: m } }));
    expect(d.mentor.availability).toBe("FULL");
    expect(d.waitlist).toMatchObject({ status: "WAITING", position: 2 });
    expect(d.waitlistCount).toBe(2);
  });
});

describe("صف انتظار — آزاد شدن صندلی و نوبت", () => {
  it("پایان رابطه → نفر اول نوبت + اعلان؛ صندلی رزرو است؛ نوبت → درخواست عادی → پذیرش", async () => {
    const { m, s0, rel } = await fullMentor();
    const a = await makeUser();
    const b = await makeUser();
    const outsider = await makeUser();
    await join(a, m);
    await join(b, m);

    expect((await mentorshipAction(s0, rel, "end")).status).toBe(200);
    const ea = await entry(m, a);
    expect(ea?.status).toBe("OFFERED");
    expect(ea!.offerExpiresAt!.getTime() - ea!.offeredAt!.getTime()).toBe(WAITLIST_OFFER_MS);
    expect(await mine(a, m)).toMatchObject({ status: "OFFERED" });
    expect(await mine(b, m)).toMatchObject({ status: "WAITING", position: 1 });
    const note = await prisma.inAppNotification.findFirst({ where: { userId: a, type: "mentor.waitlist.offer" } });
    expect(note?.url).toBe(`/mentors/${m}`);

    // صندلی برای a نگه داشته شده: درخواست مستقیم غریبه ۴۰۹ با کد پر بودن
    const direct = await requestMentorship(outsider, m);
    expect(direct.status).toBe(409);
    expect((await j(direct)).code).toBe("MENTOR_FULL");

    // صف مربی: نوبت‌دار اول، بعد منتظرها
    as(m);
    const q = await j(await mentorWaitlist());
    expect(q.entries.map((e: any) => [e.user.id, e.status, e.position])).toEqual([[a, "OFFERED", null], [b, "WAITING", 1]]);
    expect(q.reserved).toBe(1);
    expect(JSON.stringify(q)).not.toMatch(/email|phone/i);

    // پذیرش نوبت = درخواست عادی (با سقف پر هم مجاز)
    const req1 = await requestMentorship(a, m, "سلام");
    expect(req1.status).toBe(200);
    const mid = (await j(req1)).mentorship.id;
    expect((await entry(m, a))?.status).toBe("ACCEPTED");
    expect((await entry(m, a))?.mentorshipId).toBe(mid);
    // هنوز رزرو است (PENDING): b نوبت نمی‌گیرد
    await advanceWaitlist(m);
    expect((await entry(m, b))?.status).toBe("WAITING");

    expect((await mentorshipAction(m, mid, "accept")).status).toBe(200);
    expect(await prisma.mentorship.count({ where: { mentorId: m, status: "ACTIVE" } })).toBe(1);
  });

  it("رد درخواست آمده از صف → صندلی به نفر بعدی؛ درخواست قدیمی مستقیم نمی‌تواند از صف جلو بزند", async () => {
    const m = await makeMentor();
    const s0 = await makeUser();
    const early = await makeUser();
    const a = await makeUser();
    const b = await makeUser();
    const earlyReq = (await j(await requestMentorship(early, m))).mentorship.id; // قبل از پر شدن
    await settings(m, { maxActiveStudents: 1 });
    const rel = await connect(s0, m);
    await join(a, m);
    await join(b, m);
    await mentorshipAction(m, rel, "end");
    expect((await entry(m, a))?.status).toBe("OFFERED");

    // صندلی رزرو a است؛ پذیرش درخواست قدیمی early ۴۰۹
    const acc = await mentorshipAction(m, earlyReq, "accept");
    expect(acc.status).toBe(409);
    expect((await j(acc)).error).toContain("صف");

    const mid = (await j(await requestMentorship(a, m))).mentorship.id;
    expect((await mentorshipAction(m, mid, "reject")).status).toBe(200);
    expect((await entry(m, b))?.status).toBe("OFFERED");
    expect((await entry(m, a))?.mentorshipId).toBeNull();
  });

  it("انقضا: نوبت منقضی → EXPIRED + اعلان و نوبت به نفر بعد؛ رد نوبت هم همین", async () => {
    const { m, s0, rel } = await fullMentor();
    const a = await makeUser();
    const b = await makeUser();
    const c = await makeUser();
    await join(a, m);
    await join(b, m);
    await join(c, m);
    await mentorshipAction(s0, rel, "end");
    expect((await entry(m, a))?.status).toBe("OFFERED");

    await prisma.mentorWaitlistEntry.update({ where: { mentorId_userId: { mentorId: m, userId: a } }, data: { offerExpiresAt: new Date(Date.now() - 1000) } });
    // مسیر خواندن صف را جلو می‌برد (بدون کران)
    expect(await mine(b, m)).toMatchObject({ status: "OFFERED" });
    expect(await mine(a, m)).toMatchObject({ status: "EXPIRED" });
    expect(await prisma.inAppNotification.count({ where: { userId: a, type: "mentor.waitlist.expired" } })).toBe(1);
    // دوباره اجرا → اعلان تکراری نه (idempotent)
    await advanceWaitlist(m);
    expect(await prisma.inAppNotification.count({ where: { userId: a, type: "mentor.waitlist.expired" } })).toBe(1);

    // نوبت‌دار منقضی دیگر نمی‌تواند با آن نوبت درخواست بدهد
    expect((await requestMentorship(a, m)).status).toBe(409);

    // رد نوبت (DELETE) → c
    expect((await leave(b, m)).status).toBe(200);
    expect((await entry(m, c))?.status).toBe("OFFERED");
    // ورود دوباره‌ی a بعد از انقضا → ته صف
    expect((await j(await join(a, m))).waitlist).toMatchObject({ status: "WAITING", position: 1 });
  });

  it("بالا بردن ظرفیت در تنظیمات به همان تعداد نوبت می‌دهد", async () => {
    const { m } = await fullMentor();
    const users = [await makeUser(), await makeUser(), await makeUser()];
    for (const u of users) await join(u, m);
    await settings(m, { maxActiveStudents: 3 });
    const st = await Promise.all(users.map(async (u) => (await entry(m, u))?.status));
    expect(st).toEqual(["OFFERED", "OFFERED", "WAITING"]);
  });

  it("پذیرش خاموش نوبت نمی‌دهد؛ روشن شدنش می‌دهد", async () => {
    const { m, s0, rel } = await fullMentor();
    const a = await makeUser();
    await join(a, m);
    await settings(m, { acceptingStudents: false });
    await mentorshipAction(s0, rel, "end");
    expect((await entry(m, a))?.status).toBe("WAITING");
    await settings(m, { acceptingStudents: true });
    expect((await entry(m, a))?.status).toBe("OFFERED");
  });

  it("هم‌زمانی: چند پیش‌بردن هم‌زمان برای یک صندلی فقط یک نوبت و یک اعلان", async () => {
    const { m, s0, rel } = await fullMentor();
    const users = [await makeUser(), await makeUser(), await makeUser()];
    for (const u of users) await join(u, m);
    // پایان بدون مسیر روت (مثل حذف حساب) تا پیش‌بردن فقط از این‌جا باشد
    await prisma.mentorship.update({ where: { id: rel }, data: { status: "ENDED", endedAt: new Date() } });
    await Promise.all(Array.from({ length: 6 }, () => advanceWaitlist(m)));
    const offered = await prisma.mentorWaitlistEntry.count({ where: { mentorId: m, status: "OFFERED" } });
    expect(offered).toBe(1);
    expect((await entry(m, users[0]))?.status).toBe("OFFERED");
    expect(await prisma.inAppNotification.count({ where: { userId: users[0], type: "mentor.waitlist.offer" } })).toBe(1);
    void s0;
  });
});

describe("صف انتظار — سمت مربی", () => {
  it("خارج کردن: فقط صف خودم (ضد IDOR)، اعلان به کاربر، نوبت آزاد به نفر بعد", async () => {
    const { m, s0, rel } = await fullMentor();
    const other = await makeMentor();
    const a = await makeUser();
    const b = await makeUser();
    await join(a, m);
    await join(b, m);
    await mentorshipAction(s0, rel, "end");
    const ea = await entry(m, a);

    as(other);
    expect((await mentorRemove(req("DELETE", `/api/mentor/waitlist/${ea!.id}`), { params: { entryId: ea!.id } })).status).toBe(404);
    as(m);
    expect((await mentorRemove(req("DELETE", `/api/mentor/waitlist/${ea!.id}`), { params: { entryId: ea!.id } })).status).toBe(200);
    expect((await entry(m, a))?.status).toBe("CANCELLED");
    expect(await prisma.inAppNotification.count({ where: { userId: a, type: "mentor.waitlist.removed" } })).toBe(1);
    expect((await entry(m, b))?.status).toBe("OFFERED");
    as(m);
    expect((await mentorRemove(req("DELETE", `/api/mentor/waitlist/${ea!.id}`), { params: { entryId: ea!.id } })).status).toBe(404);

    // کاربر بدون پروفایل مربی
    as(a);
    expect((await mentorWaitlist()).status).toBe(403);
  });
});
