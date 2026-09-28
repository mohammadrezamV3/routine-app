import { describe, it, expect, afterAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));

import { prisma } from "@/lib/prisma";
import { GET, POST, DELETE } from "@/app/api/admin/demo-data/route";
import { DEMO_USER_WHERE } from "@/lib/demoData";
import { as, j, makeUser, cleanupUsers } from "./helpers/mentorTestUtils";
import { giveKey, openAs } from "./helpers/e2eeTestUtils";
import { MESSAGE_SELECT, serializeMessage } from "@/lib/mentorChatServer";

// ابزارِ داده‌ی آزمایشی: فقط Owner؛ ساختِ دوباره تکراری نمی‌سازه؛ حذف همه‌چیز
// (از جمله ردیف‌های Owner که ابزار ساخته) رو برمی‌داره و بقیه‌ی داده‌ی Owner رو نه.

afterAll(async () => {
  await DELETE();
  await cleanupUsers();
});

describe("داده‌ی آزمایشی", () => {
  it("ناشناس ۴۰۱، ادمینِ محدود (حتی با settings) ۴۰۳", async () => {
    as(null);
    expect((await GET()).status).toBe(401);
    as(await makeUser({ adminPermissions: ["settings", "mentors"] }));
    expect((await GET()).status).toBe(403);
    expect((await POST()).status).toBe(403);
    expect((await DELETE()).status).toBe(403);
  });

  it("Owner: ساخت، ساختِ دوباره بدونِ تکرار، حذفِ کامل", async () => {
    const owner = await makeUser();
    await prisma.user.update({ where: { id: owner }, data: { isSuperAdmin: true } });
    as(owner);

    const first = (await j(await POST())).status;
    expect(first.seeded).toBe(true);
    expect(first.counts.mentors).toBe(9);
    expect(first.counts.students).toBe(12);
    expect(first.ownerProfileCreated).toBe(true);
    const second = (await j(await POST())).status;
    expect(second.counts).toEqual(first.counts);
    expect(await prisma.user.count({ where: DEMO_USER_WHERE })).toBe(21);

    // رتبه‌بندیِ شایستگی همون لحظه ساخته شده و متنوعه: سارا و امیر واجدِ «محبوب»،
    // کیان (نظرهای تأییدنشده) و پریسا (تازه) نه؛ امیر با شاگردهای بیشتر جلوتر از کیان
    const rank = async (username: string) =>
      prisma.mentorRankingStat.findFirst({ where: { category: "ALL", profile: { user: { username } } }, select: { score: true, eligible: true, verifiedReviews: true } });
    const [sara, amir, kian, parisa] = await Promise.all(["demo_sara", "demo_amir", "demo_kian", "demo_parisa"].map(rank));
    expect(sara?.eligible).toBe(true);
    expect(amir?.eligible).toBe(true);
    expect(kian?.eligible).toBe(false);
    expect(kian?.verifiedReviews).toBe(0);
    expect(parisa?.eligible).toBe(false);
    expect(amir!.score).toBeGreaterThan(kian!.score);

    // Owner هم شاگرد (فعال + دعوتِ در انتظار + یک رابطه‌ی پایان‌یافته با دلیل) و هم منتور است
    expect(await prisma.mentorship.count({ where: { studentId: owner } })).toBe(3);
    expect(await prisma.mentorship.count({ where: { mentorId: owner } })).toBeGreaterThanOrEqual(4);
    const statuses = new Set((await prisma.mentorProgram.findMany({ select: { status: true } })).map((p) => p.status));
    for (const s of ["DRAFT", "PENDING", "ACCEPTED", "REJECTED", "ACTIVE", "COMPLETED", "CANCELLED"]) expect(statuses.has(s as any)).toBe(true);
    const mirror = await prisma.userSetting.findFirst({ where: { userId: owner, key: "customOccurrences" } });
    expect((mirror?.value as unknown[]).length).toBeGreaterThan(0);
    // کاربرِ آزمایشی نمی‌تونه وارد بشه: رمزِ ذخیره‌شده هش bcrypt یک رشته‌ی دورریخته‌ست
    const demo = await prisma.user.findFirst({ where: DEMO_USER_WHERE, select: { passwordHash: true } });
    expect(demo?.passwordHash).toMatch(/^\$2[aby]\$/);

    const audit = await prisma.auditLog.count({ where: { actorUserId: owner, action: "demo.seed" } });
    expect(audit).toBe(2);

    const cleared = (await j(await DELETE())).status;
    expect(cleared.seeded).toBe(false);
    expect(await prisma.user.count({ where: DEMO_USER_WHERE })).toBe(0);
    expect(await prisma.mentorProfile.count({ where: { userId: owner } })).toBe(0);
    expect(await prisma.mentorship.count({ where: { OR: [{ mentorId: owner }, { studentId: owner }] } })).toBe(0);
    expect(await prisma.inAppNotification.count({ where: { userId: owner } })).toBe(0);
    const after = await prisma.userSetting.findFirst({ where: { userId: owner, key: "customOccurrences" } });
    expect(after?.value).toEqual([]);
  });

  // رمزگذاریِ سرتاسری (agent D): هیچ پیامِ آزمایشی متنِ ساده ندارد؛ گفت‌وگوی Owner فقط
  // وقتی پیام می‌گیرد که Owner کلید داشته باشد و همان را با کلیدِ خودش باز می‌کند؛
  // گزارشِ پیامِ آزمایشی متنِ تأییدشده (رمزشده در سکون) دارد.
  it("پیام‌های آزمایشی رمزگذاری‌شده‌اند؛ Owner بدونِ کلید گفت‌وگوی خالی، با کلید قابل‌خواندن", async () => {
    const owner = await makeUser();
    await prisma.user.update({ where: { id: owner }, data: { isSuperAdmin: true } });
    as(owner);
    const res = await j(await POST());
    expect(res.warnings.some((w: string) => w.includes("کلید رمزگذاری ندارد"))).toBe(true);
    expect(await prisma.mentorMessage.count({ where: { mentorship: { OR: [{ mentorId: owner }, { studentId: owner }] } } })).toBe(0);
    expect(await prisma.mentorMessage.count({ where: { legacyBody: { not: null }, sender: DEMO_USER_WHERE } })).toBe(0);
    const rep = await prisma.mentorReport.findFirst({ where: { targetType: "MESSAGE", reporter: DEMO_USER_WHERE } });
    expect(rep?.reportVerified).toBe(true);
    expect(rep?.reportedText?.startsWith("enc1:")).toBe(true);

    await giveKey(owner);
    as(owner);
    await POST();
    // پیام‌ها scheme 2: برای همه‌ی کلیدهای فعالِ Owner بسته‌بندی شده‌اند (همان شکلی که API می‌دهد)
    const rows = await prisma.mentorMessage.findMany({
      where: { mentorship: { OR: [{ mentorId: owner }, { studentId: owner }] } },
      select: { ...MESSAGE_SELECT, mentorshipId: true },
    });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.legacyBody).toBeNull();
      expect(r.scheme).toBe(2);
      const d: any = await openAs(owner, r.mentorshipId, serializeMessage(r, owner));
      expect(d.committed).toBe(true);
      expect(d.text.length).toBeGreaterThan(0);
    }
    await DELETE();
  });

  it("پروفایلِ منتوریِ ازقبل‌موجودِ Owner با حذف دست نمی‌خورد", async () => {
    const owner = await makeUser();
    await prisma.user.update({ where: { id: owner }, data: { isSuperAdmin: true } });
    await prisma.mentorProfile.create({ data: { userId: owner, categories: ["FITNESS"], bio: "واقعی" } });
    as(owner);
    const st = (await j(await POST())).status;
    expect(st.ownerProfileCreated).toBe(false);
    // برنامه‌های Owner به‌عنوانِ منتور با حوزه‌ی خودش (FITNESS → WORKOUT) ساخته می‌شن
    const types = new Set((await prisma.mentorProgram.findMany({ where: { mentorId: owner }, select: { type: true } })).map((p) => p.type));
    expect(Array.from(types)).toEqual(["WORKOUT"]);
    await DELETE();
    const p = await prisma.mentorProfile.findUnique({ where: { userId: owner } });
    expect(p?.bio).toBe("واقعی");
  });
});
