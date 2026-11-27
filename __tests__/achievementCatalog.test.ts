import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, GOLDEN_REQUIRED_IDS, goldenReached, MAX_ACHIEVEMENT_DAYS, type AchievementMetrics } from "@/lib/achievements";
import { computeUserAchievements } from "@/lib/achievementsServer";
import { makeUser, cleanupUsers } from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const goalOf = (id: string) => ACHIEVEMENT_BY_ID[id].progress({} as AchievementMetrics).goal;

describe("کاتالوگ اچیومنت: قابل رسیدن تا 90 روز", () => {
  it("هر اچیومنت maxDays معتبر دارد و بیشتر از 90 روز نیست", () => {
    expect(MAX_ACHIEVEMENT_DAYS).toBe(90);
    for (const a of ACHIEVEMENTS) {
      expect(Number.isFinite(a.maxDays), a.id).toBe(true);
      expect(a.maxDays, a.id).toBeGreaterThan(0);
      expect(a.maxDays, a.id).toBeLessThanOrEqual(MAX_ACHIEVEMENT_DAYS);
    }
  });

  it("شناسه‌ها یکتا و هدف‌ها مثبت", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(goalOf(a.id), a.id).toBeGreaterThan(0);
  });

  it("هدف‌های هر نردبان صعودی‌اند و روز لازم با هدف کم نمی‌شود", () => {
    const groups = new Map<string, { goal: number; maxDays: number; id: string }[]>();
    for (const a of ACHIEVEMENTS) {
      // نردبان = همان متریک؛ متریک از راه مقدار پیشرفت روی یک نمونه کشف می‌شود
      const probe = new Proxy({} as Record<string, number>, { get: (_, k) => { keys.push(String(k)); return 0; } }) as unknown as AchievementMetrics;
      const keys: string[] = [];
      a.progress(probe);
      const metric = keys[0] ?? a.id;
      const list = groups.get(metric) ?? [];
      list.push({ goal: goalOf(a.id), maxDays: a.maxDays, id: a.id });
      groups.set(metric, list);
    }
    for (const [metric, list] of groups) {
      const byGoal = [...list].sort((x, y) => x.goal - y.goal);
      for (let i = 1; i < byGoal.length; i++) {
        expect(byGoal[i].goal, `${metric}: ${byGoal[i - 1].id} / ${byGoal[i].id}`).toBeGreaterThan(byGoal[i - 1].goal);
        expect(byGoal[i].maxDays, `${metric}: ${byGoal[i].id}`).toBeGreaterThanOrEqual(byGoal[i - 1].maxDays);
      }
    }
  });

  it("هر بخش نردبان معنی‌دار دارد", () => {
    const count = (cat: string) => ACHIEVEMENTS.filter((a) => a.category === cat).length;
    expect(count("streak")).toBeGreaterThanOrEqual(5);
    expect(count("body")).toBeGreaterThanOrEqual(5);
    expect(count("trade")).toBeGreaterThanOrEqual(5);
  });

  it("اچیومنت‌های حذف‌شده دیگر در کاتالوگ نیستند", () => {
    for (const id of ["streak_180", "streak_365", "streak_500", "perfect_1000", "ticks_10000", "week_52", "month_12", "workout_365"]) {
      expect(ACHIEVEMENT_BY_ID[id], id).toBeUndefined();
    }
  });
});

describe("سازگاری با کاربران قدیمی", () => {
  it("شناسه‌ی حذف‌شده نمایش و شمارش نمی‌شود و نام طلایی با باز بودن همه‌ی کاتالوگ فعلی سمت سرور ست می‌شود", async () => {
    const userId = await makeUser();
    await prisma.userAchievement.createMany({
      data: [...ACHIEVEMENTS.map((a) => a.id), "streak_365", "perfect_1000"].map((achievementId) => ({ userId, achievementId })),
    });
    const p = await computeUserAchievements(userId);
    expect(p!.total).toBe(ACHIEVEMENTS.length);
    expect(p!.unlockedCount).toBe(ACHIEVEMENTS.length);
    expect(p!.items.map((i) => i.id)).not.toContain("streak_365");
    expect(p!.golden).toBe(true);
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { goldenSince: true } });
    expect(u?.goldenSince).not.toBeNull();
  });

  it("بدون همه‌ی اچیومنت‌ها نام طلایی ست نمی‌شود و goldenSince قبلی حفظ می‌شود", async () => {
    const a = await makeUser();
    const pa = await computeUserAchievements(a);
    expect(pa!.golden).toBe(false);

    const b = await makeUser();
    const since = new Date("2026-01-01T00:00:00Z");
    await prisma.user.update({ where: { id: b }, data: { goldenSince: since } });
    const pb = await computeUserAchievements(b);
    expect(pb!.golden).toBe(true);
    expect(pb!.goldenSince).toBe(since.toISOString());
  });
});

describe("نام طلایی و اچیومنت‌های نقش‌محور", () => {
  it("منتور/شاگرد در کاتالوگ هستند ولی لازمه‌ی طلایی نیستند", () => {
    const role = ACHIEVEMENTS.filter((a) => a.roleBased).map((a) => a.id).sort();
    expect(role).toEqual(["mentee_program_1", "mentor_students_5"]);
    expect(GOLDEN_REQUIRED_IDS.length).toBe(ACHIEVEMENTS.length - 2);
    expect(goldenReached(GOLDEN_REQUIRED_IDS)).toBe(true);
    expect(goldenReached(GOLDEN_REQUIRED_IDS.slice(1))).toBe(false);
  });

  it("سرور بدون اچیومنت‌های نقش‌محور هم طلایی می‌کند و شمارنده‌ی طلایی آنها را نمی‌شمارد", async () => {
    const userId = await makeUser();
    await prisma.userAchievement.createMany({ data: GOLDEN_REQUIRED_IDS.map((achievementId) => ({ userId, achievementId })) });
    const p = await computeUserAchievements(userId);
    expect(p!.golden).toBe(true);
    expect(p!.goldenUnlocked).toBe(GOLDEN_REQUIRED_IDS.length);
    expect(p!.goldenTotal).toBe(GOLDEN_REQUIRED_IDS.length);
    expect(p!.unlockedCount).toBe(ACHIEVEMENTS.length - 2);
  });
});
