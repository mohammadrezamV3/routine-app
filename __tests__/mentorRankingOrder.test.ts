import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

import type { MentorProgramStatus, MentorProgramType, ProgramLogStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GET as discover } from "@/app/api/mentors/route";
import { GET as popular } from "@/app/api/mentors/popular/route";
import { countsForMentor, loadNewcomerCards, loadRankingBreakdown, recomputeMentorRankings } from "@/lib/mentorRankingStats";
import { DISCOVERABLE_PROFILE_WHERE } from "@/lib/mentorServer";
import { as, req, j, makeUser, cleanupUsers, uniqueTag } from "./helpers/mentorTestUtils";

// تستِ یکپارچه‌ی رتبه‌بندیِ شایستگی روی دیتابیسِ واقعی: چند منتور با الگوهای
// متفاوت ساخته می‌شن و ترتیبِ «بهترین نتیجه»، «بالاترین امتیاز»، دسته،
// «منتورهای محبوب» و «منتورهای تازه» بررسی می‌شه.

const DAY = 86_400_000;
const now = new Date();
const ago = (d: number) => new Date(now.getTime() - d * DAY);
const dateOnly = (d: Date) => new Date(d.toISOString().slice(0, 10) + "T00:00:00.000Z");

const demoIds: string[] = [];
const tag = uniqueTag();

async function makeDemoUser(key: string): Promise<string> {
  const u = await prisma.user.create({
    data: { email: `demo+${tag}${key}@demo.arion.local`, username: `demo_${tag}${key}`.slice(0, 30), passwordHash: "x", market: "IRAN", createdAt: ago(300) },
    select: { id: true },
  });
  demoIds.push(u.id);
  return u.id;
}

async function makeProfile(userId: string, name: string, opts: { categories: string[]; identity?: "VERIFIED" | "PENDING"; certs?: string[]; suspended?: boolean; createdDaysAgo?: number; ratingAvg?: number; ratingCount?: number }) {
  const p = await prisma.mentorProfile.create({
    data: {
      userId,
      headline: `${tag} ${name}`,
      bio: "بیوی کامل برای تست رتبه‌بندی",
      categories: opts.categories,
      published: true,
      identityStatus: opts.identity ?? "VERIFIED",
      suspendedAt: opts.suspended ? ago(1) : null,
      lastActiveAt: now,
      createdAt: ago(opts.createdDaysAgo ?? 200),
      ratingAvg: opts.ratingAvg ?? 0,
      ratingCount: opts.ratingCount ?? 0,
      credentials: { create: opts.categories.map((c) => ({ category: c, status: opts.certs?.includes(c) ? ("VERIFIED" as const) : ("NOT_PROVIDED" as const) })) },
    },
    select: { id: true },
  });
  return p.id;
}

async function rel(mentorId: string, studentId: string, o: { startedDaysAgo: number; categories: string[]; status?: "ACTIVE" | "ENDED"; endedDaysAgo?: number }) {
  return prisma.mentorship.create({
    data: {
      mentorId,
      studentId,
      status: o.status ?? "ACTIVE",
      initiatedBy: "STUDENT",
      categories: o.categories,
      createdAt: new Date(ago(o.startedDaysAgo).getTime() - 3 * 3_600_000),
      startedAt: ago(o.startedDaysAgo),
      endedAt: o.endedDaysAgo !== undefined ? ago(o.endedDaysAgo) : null,
    },
    select: { id: true, mentorId: true, studentId: true },
  });
}

/** برنامه با یک آیتمِ روزانه و لاگِ روزهای گذشته (done از هر ۱۰ روز) */
async function program(
  r: { id: string; mentorId: string; studentId: string },
  o: { type: MentorProgramType; status: MentorProgramStatus; activatedDaysAgo: number; completedDaysAgo?: number; endInDays?: number; logDays?: number; donePer10?: number }
) {
  const p = await prisma.mentorProgram.create({
    data: {
      mentorshipId: r.id, mentorId: r.mentorId, studentId: r.studentId, type: o.type, title: "برنامه", status: o.status,
      startDate: dateOnly(ago(o.activatedDaysAgo)),
      endDate: dateOnly(o.completedDaysAgo !== undefined ? ago(o.completedDaysAgo) : ago(-(o.endInDays ?? 30))),
      sentAt: ago(o.activatedDaysAgo + 1), respondedAt: ago(o.activatedDaysAgo), activatedAt: ago(o.activatedDaysAgo),
      completedAt: o.status === "COMPLETED" ? ago(o.completedDaysAgo ?? 1) : null,
      cancelledAt: o.status === "CANCELLED" ? ago(o.completedDaysAgo ?? 1) : null,
      // همگام‌سازیِ خودکار روی این برنامه‌ها اجرا نشه (لاگ‌ها دستی ساخته می‌شن)
      progressSyncedAt: now,
      items: { create: [{ order: 0, title: "آیتم", repeat: "DAILY", days: [0, 1, 2, 3, 4, 5, 6] }] },
    },
    select: { id: true, items: { select: { id: true } } },
  });
  if (o.logDays) {
    const done = o.donePer10 ?? 9;
    await prisma.mentorProgramLog.createMany({
      data: Array.from({ length: o.logDays }, (_, i) => ({
        programId: p.id, itemId: p.items[0].id, studentId: r.studentId, date: dateOnly(ago(i + 1)),
        status: (i % 10 < done ? "COMPLETED" : "MISSED") as ProgramLogStatus,
      })),
    });
  }
  return p.id;
}

const ids: Record<string, string> = {};
const profiles: Record<string, string> = {};

beforeAll(async () => {
  const viewer = await makeUser({ username: `${tag}viewer`.slice(0, 20) });
  ids.viewer = viewer;
  for (const k of ["strong", "hype", "demoBoost", "suspended", "fresh", "hybrid"]) ids[k] = await makeUser({ username: `${tag}${k}`.slice(0, 20) });
  const students = async (prefix: string, n: number) => Promise.all(Array.from({ length: n }, (_, i) => makeUser({ username: `${tag}${prefix}${i}`.slice(0, 20) })));

  // ── strong: بدنسازی، نتیجه‌ی واقعی و پایدار ──
  profiles.strong = await makeProfile(ids.strong, "strong", { categories: ["FITNESS"], certs: ["FITNESS"] });
  for (const [i, s] of (await students("st", 4)).entries()) {
    const r = await rel(ids.strong, s, { startedDaysAgo: 70, categories: ["FITNESS"] });
    await program(r, { type: "WORKOUT", status: "COMPLETED", activatedDaysAgo: 65, completedDaysAgo: 35 });
    await program(r, { type: "WORKOUT", status: "ACTIVE", activatedDaysAgo: 30, logDays: 25, donePer10: 9 });
    if (i < 2) await prisma.mentorReview.create({ data: { mentorId: ids.strong, studentId: s, mentorshipId: r.id, rating: 5 - i, createdAt: ago(5) } });
  }

  // ── hype: شش نظرِ ۵ستاره از رابطه‌های سه‌روزه، بدونِ برنامه ──
  profiles.hype = await makeProfile(ids.hype, "hype", { categories: ["FITNESS"], certs: ["FITNESS"], ratingAvg: 5, ratingCount: 6 });
  for (const s of await students("hy", 6)) {
    const r = await rel(ids.hype, s, { startedDaysAgo: 3, categories: ["FITNESS"] });
    await prisma.mentorReview.create({ data: { mentorId: ids.hype, studentId: s, mentorshipId: r.id, rating: 5, createdAt: ago(1) } });
  }

  // ── demoBoost: منتورِ واقعی که فقط شاگردهای آزمایشیِ عالی داره ──
  profiles.demoBoost = await makeProfile(ids.demoBoost, "demoboost", { categories: ["FITNESS"], certs: ["FITNESS"] });
  for (let i = 0; i < 5; i++) {
    const s = await makeDemoUser(`d${i}`);
    const r = await rel(ids.demoBoost, s, { startedDaysAgo: 80, categories: ["FITNESS"] });
    await program(r, { type: "WORKOUT", status: "COMPLETED", activatedDaysAgo: 75, completedDaysAgo: 40 });
    await program(r, { type: "WORKOUT", status: "ACTIVE", activatedDaysAgo: 30, logDays: 25, donePer10: 10 });
    await prisma.mentorReview.create({ data: { mentorId: ids.demoBoost, studentId: s, mentorshipId: r.id, rating: 5, createdAt: ago(10) } });
  }

  // ── suspended: مثلِ strong ولی تعلیق‌شده ──
  profiles.suspended = await makeProfile(ids.suspended, "suspended", { categories: ["FITNESS"], certs: ["FITNESS"], suspended: true });
  for (const s of await students("su", 4)) {
    const r = await rel(ids.suspended, s, { startedDaysAgo: 70, categories: ["FITNESS"] });
    await program(r, { type: "WORKOUT", status: "ACTIVE", activatedDaysAgo: 30, logDays: 25, donePer10: 10 });
  }

  // ── fresh: تأییدشده، پروفایلِ کامل، بدونِ شاگرد ──
  profiles.fresh = await makeProfile(ids.fresh, "fresh", { categories: ["FITNESS"], certs: ["FITNESS"], createdDaysAgo: 5 });

  // ── hybrid: روتینِ عالی، بدنسازیِ ضعیف ──
  profiles.hybrid = await makeProfile(ids.hybrid, "hybrid", { categories: ["ROUTINE", "FITNESS"], certs: ["ROUTINE", "FITNESS"] });
  for (const s of await students("hr", 4)) {
    const r = await rel(ids.hybrid, s, { startedDaysAgo: 70, categories: ["ROUTINE"] });
    await program(r, { type: "ROUTINE", status: "COMPLETED", activatedDaysAgo: 60, completedDaysAgo: 30 });
    await program(r, { type: "ROUTINE", status: "ACTIVE", activatedDaysAgo: 25, logDays: 22, donePer10: 10 });
  }
  for (const s of await students("hf", 3)) {
    const r = await rel(ids.hybrid, s, { startedDaysAgo: 70, categories: ["FITNESS"], status: "ENDED", endedDaysAgo: 65 });
    await program(r, { type: "WORKOUT", status: "CANCELLED", activatedDaysAgo: 68, completedDaysAgo: 66, logDays: 0 });
  }

  await recomputeMentorRankings();
}, 60_000);

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: demoIds } } });
  await cleanupUsers();
});

async function list(params: string) {
  as(ids.viewer);
  const res = await discover(req("GET", `/api/mentors?q=${tag}&${params}`));
  expect(res.status).toBe(200);
  return ((await j(res)).mentors as { userId: string }[]).map((m) => m.userId);
}
const who = (userIds: string[]) => userIds.map((u) => Object.keys(ids).find((k) => ids[k] === u));

describe("رتبه‌بندیِ شایستگی — ترتیبِ واقعی", () => {
  it("«بهترین نتیجه»: نتیجه‌ی واقعی اول؛ تعلیق‌شده نیست؛ نظرِ ساختگی و شاگردِ آزمایشی بالا نمی‌برند", async () => {
    const order = who(await list("sort=best"));
    expect(order[0]).toBe("strong");
    expect(order).not.toContain("suspended");
    expect(order.indexOf("strong")).toBeLessThan(order.indexOf("hype"));
    expect(order.indexOf("strong")).toBeLessThan(order.indexOf("demoBoost"));
    expect(order.sort()).toEqual(["demoBoost", "fresh", "hybrid", "hype", "strong"]);
    // نام قدیمیِ popular همون ترتیب رو می‌ده
    expect(who(await list("sort=popular"))[0]).toBe("strong");
  });

  it("ترتیب قطعی است (دو درخواستِ پشت‌سرهم یکسان)", async () => {
    expect(await list("sort=best")).toEqual(await list("sort=best"));
  });

  it("«بالاترین امتیاز» فقط از نظرهای تأییدشده: میانگینِ خامِ ۵ی hype جلو نمی‌زند", async () => {
    const order = who(await list("sort=rating"));
    expect(order.indexOf("strong")).toBeLessThan(order.indexOf("hype"));
  });

  it("رتبه‌ی هر دسته از سیگنال‌های همون حوزه", async () => {
    expect(who(await list("sort=best&category=ROUTINE"))).toEqual(["hybrid"]);
    const fitness = who(await list("sort=best&category=FITNESS"));
    expect(fitness[0]).toBe("strong");
    expect(fitness.indexOf("strong")).toBeLessThan(fitness.indexOf("hybrid"));
  });

  it("شاگردهای آزمایشی برای منتورِ واقعی شمرده نمی‌شوند", async () => {
    const rows = await loadRankingBreakdown(profiles.demoBoost);
    const all = rows.find((r) => r.scope === "ALL")!;
    expect(all.breakdown.sample.students).toBe(0);
    expect(all.breakdown.sample.verifiedReviews).toBe(0);
    expect(all.eligible).toBe(false);
    expect(countsForMentor({ email: "demo+1@demo.arion.local", username: "demo_x", isBlocked: false, deletedAt: null, createdAt: now }, true)).toBe(true);
    expect(countsForMentor({ email: "a@b.com", username: "a", isBlocked: true, deletedAt: null, createdAt: now }, false)).toBe(false);
  });

  it("breakdownِ ادمین: هر دامنه، جایگاه و eligibility", async () => {
    const rows = await loadRankingBreakdown(profiles.strong);
    expect(rows.map((r) => r.scope)).toEqual(["ALL", "FITNESS"]);
    const all = rows[0];
    expect(all.eligible).toBe(true);
    expect(all.position).toBeGreaterThanOrEqual(1);
    expect(all.breakdown.sample.students).toBe(4);
    expect(all.breakdown.sample.verifiedReviews).toBe(2);
    expect(all.breakdown.components.completion.raw).toBe(1);
    const hype = (await loadRankingBreakdown(profiles.hype))[0];
    expect(hype.breakdown.sample.verifiedReviews).toBe(0);
    expect(hype.breakdown.sample.excludedReviews).toBe(6);
    expect(hype.eligible).toBe(false);
    const suspended = (await loadRankingBreakdown(profiles.suspended))[0];
    expect(suspended.position).toBeNull();
  });

  it("«منتورهای محبوب» فقط واجدِ شرایط؛ «منتورهای تازه» جدا", async () => {
    as(ids.viewer);
    const data = await j(await popular());
    const pop = who((data.mentors as { userId: string }[]).map((m) => m.userId));
    expect(pop).toContain("strong");
    for (const k of ["hype", "demoBoost", "suspended", "fresh"]) expect(pop).not.toContain(k);
    expect(Array.isArray(data.newcomers)).toBe(true);

    const fresh = await loadNewcomerCards({ ...DISCOVERABLE_PROFILE_WHERE, headline: { startsWith: tag } }, [], 6);
    const freshWho = who(fresh.map((c) => c.userId));
    expect(freshWho).toContain("fresh");
    expect(freshWho).not.toContain("strong");
  });
});
