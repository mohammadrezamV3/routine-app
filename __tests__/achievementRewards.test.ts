import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, achievementDesc } from "@/lib/achievements";
import { readFileSync } from "fs";
import path from "path";
import { computeAchievementMetrics, longestDayRun } from "@/lib/achievementsCompute";
import {
  bestUnusedReward,
  isMonthlyOption,
  pickBestDiscount,
  reachedRewardTiers,
  rewardStates,
} from "@/lib/achievementRewards";
import { findAchievementReward, consumeAchievementReward } from "@/lib/achievementsServer";
import { signCheckoutParams, verifyCheckoutSignature } from "@/lib/checkoutSignature";
import { makeUser, cleanupUsers } from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const TOTAL = ACHIEVEMENTS.length;
// کامپوننت tsx در محیط تست node بارگذاری نمی‌شه — کلیدهای GLYPHS از متن فایل
const iconSrc = readFileSync(path.resolve(__dirname, "../components/AchievementIcons.tsx"), "utf8");
const glyphSrc = iconSrc.slice(iconSrc.indexOf("const GLYPHS"), iconSrc.indexOf("const FALLBACK_GLYPH"));
const ACHIEVEMENT_GLYPH_IDS = [...glyphSrc.matchAll(/^ {2}(\w+): \(c\) =>/gm)].map((m) => m[1]);
const HALF = Math.ceil(TOTAL / 2);

describe("کاتالوگ اچیومنت", () => {
  it("نام انگلیسی، شناسه‌ی یکتا و آیکون اختصاصی برای همه", () => {
    expect(TOTAL).toBeGreaterThanOrEqual(75);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(TOTAL);
    for (const a of ACHIEVEMENTS) {
      expect(a.name).toMatch(/^[A-Za-z][A-Za-z' -]+$/);
      expect(a.title).toBe(a.name);
      expect(ACHIEVEMENT_GLYPH_IDS).toContain(a.id);
      expect(a.desc).not.toMatch(/[\u064B-\u0652\u0654\u0655\u0670\u0623\u0625]/);
    }
  });
  it("{n} برای باز و قفل هر دو عدد واقعی (بدون علامت سوال)", () => {
    const a = ACHIEVEMENTS.find((x) => x.id === "streak_30")!;
    expect(achievementDesc(a, 30, true)).toContain("30");
    expect(achievementDesc(a, 30, false)).toContain("30");
    expect(achievementDesc(a, 30, false)).not.toMatch(/[?؟]/);
  });
});

describe("آستانه‌ی پاداش", () => {
  it("50٪ کل کاتالوگ فعلی → half، 100٪ → full", () => {
    expect(reachedRewardTiers(HALF - 1, TOTAL)).toEqual([]);
    expect(reachedRewardTiers(HALF, TOTAL)).toEqual(["half"]);
    expect(reachedRewardTiers(TOTAL - 1, TOTAL)).toEqual(["half"]);
    expect(reachedRewardTiers(TOTAL, TOTAL)).toEqual(["half", "full"]);
    // با کاتالوگ فرد، نصف یعنی سقف (مثلا 40 از 79)
    expect(reachedRewardTiers(39, 79)).toEqual([]);
    expect(reachedRewardTiers(40, 79)).toEqual(["half"]);
  });
  it("فقط گزینه‌ی یک‌ماهه", () => {
    expect(isMonthlyOption(1)).toBe(true);
    for (const m of [3, 6, 12, 2]) expect(isMonthlyOption(m)).toBe(false);
  });
  it("بیشترین درصد برنده‌ست، جمع نمی‌شه، تساوی به نفع کد", () => {
    expect(pickBestDiscount([{ source: "code", percent: 10 }, { source: "achievement", percent: 50 }])).toEqual({ source: "achievement", percent: 50 });
    expect(pickBestDiscount([{ source: "code", percent: 30 }, { source: "achievement", percent: 20 }])).toEqual({ source: "code", percent: 30 });
    expect(pickBestDiscount([{ source: "code", percent: 20 }, { source: "achievement", percent: 20 }])).toEqual({ source: "code", percent: 20 });
    expect(pickBestDiscount([{ source: "code", percent: 0 }, { source: "achievement", percent: 20 }])).toEqual({ source: "achievement", percent: 20 });
    expect(pickBestDiscount([{ source: "code", percent: 0 }, { source: "achievement", percent: 0 }])).toBeNull();
  });
  it("اول 50٪ مصرف می‌شه، مصرف‌شده دیگه انتخاب نمی‌شه", () => {
    const rows = [{ tier: "half", usedAt: null }, { tier: "full", usedAt: null }];
    expect(bestUnusedReward(rows)?.tier).toBe("full");
    expect(bestUnusedReward([{ tier: "half", usedAt: null }, { tier: "full", usedAt: new Date() }])?.tier).toBe("half");
    expect(bestUnusedReward([{ tier: "half", usedAt: new Date() }, { tier: "full", usedAt: new Date() }])).toBeNull();
    const st = rewardStates([{ tier: "half", usedAt: new Date("2026-10-01T00:00:00Z") }]);
    expect(st).toEqual([
      { tier: "half", percent: 20, unlocked: true, used: true, usedAt: "2026-10-01T00:00:00.000Z" },
      { tier: "full", percent: 50, unlocked: false, used: false, usedAt: null },
    ]);
  });
});

describe("امضای چک‌اوت با پاداش اچیومنت", () => {
  const base = { userId: "u1", planKey: "basic", duration: "1", months: 1, amount: 79200, discountPercent: 20 };
  it("بدون پاداش همون امضای قبلی (پرداخت‌های در جریان نمی‌شکنن)", () => {
    expect(signCheckoutParams(base)).toBe(signCheckoutParams({ ...base, achievementRewardId: undefined }));
  });
  it("حذف یا عوض کردن شناسه‌ی پاداش امضا رو باطل می‌کنه", () => {
    const sig = signCheckoutParams({ ...base, achievementRewardId: "r1" });
    expect(verifyCheckoutSignature({ ...base, achievementRewardId: "r1" }, sig)).toBe(true);
    expect(verifyCheckoutSignature(base, sig)).toBe(false);
    expect(verifyCheckoutSignature({ ...base, achievementRewardId: "r2" }, sig)).toBe(false);
  });
});

describe("متریک‌های تازه", () => {
  const todayIso = "2026-09-30";
  const baseInp = {
    todayIso,
    createdAtIso: "2026-06-01",
    opts: { customOccurrences: [], removedOccurrences: new Set<string>() },
    daily: {},
    wakeTargetMin: 480,
    sleepTargetMin: 1410,
    sleeps: [],
    routineItems: 0,
  };
  it("زنجیره‌ی روزها", () => {
    expect(longestDayRun(["2026-09-01", "2026-09-02", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-06"])).toBe(3);
  });
  it("تمرین: هفته‌های پشت‌سرهم با حداقل 3 جلسه (شنبه تا جمعه)", () => {
    // شنبه‌ها: 09-06, 09-13, 09-20, 09-27 (امروز سه‌شنبه 09-30)
    const dates = ["2026-09-06", "2026-09-08", "2026-09-10", "2026-09-13", "2026-09-14", "2026-09-15", "2026-09-20", "2026-09-27", "2026-09-28", "2026-09-29"];
    const m = computeAchievementMetrics({ ...baseInp, workoutDates: dates });
    expect(m.workoutSessions).toBe(10);
    // دو هفته‌ی اول ≥3، هفته‌ی سوم 1 (شکست)، هفته‌ی جاری 3 → بهترین 2
    expect(m.workoutWeekRun).toBe(2);
  });
  it("تغذیه: روزهای در محدوده‌ی هدف با هدف همون روز", () => {
    const m = computeAchievementMetrics({
      ...baseInp,
      calorieDays: [
        { iso: "2026-09-01", kcal: 2050 },
        { iso: "2026-09-02", kcal: 2500 },
        { iso: "2026-09-03", kcal: 1500 },
      ],
      calorieTargets: [
        { fromIso: "2026-08-01", toIso: "2026-09-03", kcal: 2000 },
        { fromIso: "2026-09-03", toIso: null, kcal: 1600 },
      ],
    });
    expect(m.calorieLogDays).toBe(3);
    expect(m.calorieLogRun).toBe(3);
    expect(m.calorieOnTargetDays).toBe(2);
  });
  it("ترید: ژورنال، چک‌لیست کامل، زنجیره‌ی طبق پلن", () => {
    const t = (i: number, o: Partial<{ journaled: boolean; checklistFull: boolean; followedPlan: boolean | null; reflected: boolean }>) => ({
      openedAtMs: i, journaled: true, checklistFull: false, followedPlan: true as boolean | null, reflected: false, ...o,
    });
    const m = computeAchievementMetrics({ ...baseInp, trades: [t(3, {}), t(1, { checklistFull: true }), t(2, { followedPlan: null, journaled: false }), t(4, { reflected: true })] });
    expect(m.tradesJournaled).toBe(3);
    expect(m.tradesChecklistFull).toBe(1);
    expect(m.tradePlanRun).toBe(2);
    expect(m.tradesReflected).toBe(1);
  });
});

describe("پاداش در دیتابیس: ثبت با آستانه و مصرف یک‌باره", () => {
  it("50٪ → 20٪، 100٪ → 50٪ اول، و هر کدوم فقط یک بار مصرف می‌شه", async () => {
    const userId = await makeUser();
    expect(await findAchievementReward(userId)).toBeNull();

    await prisma.userAchievement.createMany({ data: ACHIEVEMENTS.slice(0, HALF).map((a) => ({ userId, achievementId: a.id })) });
    // شناسه‌ی ناشناخته (حذف‌شده از کاتالوگ) حساب نمی‌شه
    await prisma.userAchievement.create({ data: { userId, achievementId: "legacy_unknown" } });
    const half = await findAchievementReward(userId);
    expect(half?.percent).toBe(20);

    await prisma.userAchievement.createMany({ data: ACHIEVEMENTS.slice(HALF).map((a) => ({ userId, achievementId: a.id })) });
    const full = await findAchievementReward(userId);
    expect(full?.percent).toBe(50);
    expect(full?.tier).toBe("full");

    expect(await consumeAchievementReward(full!.id, userId, "sub_1")).toBe(true);
    // verify تکراری اثری نداره
    expect(await consumeAchievementReward(full!.id, userId, "sub_2")).toBe(false);
    const next = await findAchievementReward(userId);
    expect(next?.percent).toBe(20);
    // پاداش کاربر دیگه قابل مصرف نیست
    const other = await makeUser();
    expect(await consumeAchievementReward(next!.id, other, "sub_x")).toBe(false);
    expect(await consumeAchievementReward(next!.id, userId, "sub_3")).toBe(true);
    expect(await findAchievementReward(userId)).toBeNull();

    const rows = await prisma.achievementReward.findMany({ where: { userId }, orderBy: { percent: "asc" } });
    expect(rows.map((r) => [r.tier, r.percent, !!r.usedAt, r.subscriptionId])).toEqual([
      ["half", 20, true, "sub_3"],
      ["full", 50, true, "sub_1"],
    ]);
  });
});
