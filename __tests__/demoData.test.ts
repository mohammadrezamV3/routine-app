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
    expect(first.counts.mentors).toBe(6);
    expect(first.counts.students).toBe(8);
    expect(first.ownerProfileCreated).toBe(true);
    const second = (await j(await POST())).status;
    expect(second.counts).toEqual(first.counts);
    expect(await prisma.user.count({ where: DEMO_USER_WHERE })).toBe(14);

    // Owner هم شاگرد (فعال + دعوتِ در انتظار) و هم منتور است
    expect(await prisma.mentorship.count({ where: { studentId: owner } })).toBe(2);
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
