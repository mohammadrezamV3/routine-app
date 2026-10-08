// اچیومنت‌ها سمت سرور: متریک‌ها از دیتابیس ساخته می‌شن (هیچ‌وقت از کلاینت
// پذیرفته نمی‌شن)، هر اچیومنتی که تازه باز شد در UserAchievement ثبت می‌شه و
// دیگه قفل نمی‌شه، و وقتی همه باز شدن User.goldenSince (نام طلایی) ست می‌شه.
// اضافه‌شدن اچیومنت تازه به کاتالوگ goldenSince کسی رو پس نمی‌گیره.
// پاداش تخفیف (50٪ → 20٪، 100٪ → 50٪) هم همین‌جا و در چک‌اوت ثبت می‌شه.

import { prisma } from "./prisma";
import { dayInTimezone } from "./dashboardServer";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementMetrics } from "./achievements";
import { computeAchievementMetrics } from "./achievementsCompute";
import type { ScheduleOpts } from "./schedule";
import { bestUnusedReward, reachedRewardTiers, rewardPercent, rewardStates, type AchievementRewardInfo, type AchievementRewardTier } from "./achievementRewards";

export type AchievementsPayload = {
  metrics: AchievementMetrics;
  items: { id: string; unlocked: boolean; value: number; goal: number; unlockedAt: string | null }[];
  unlockedCount: number;
  total: number;
  golden: boolean;
  goldenSince: string | null;
  /** اچیومنت‌هایی که همین درخواست باز شدن (برای جشن کلاینت) */
  fresh: string[];
  /** پاداش تخفیف اچیومنت‌ها (فقط گزینه‌ی یک‌ماهه، هر کدوم یک بار) */
  rewards: AchievementRewardInfo[];
};

// همون پیش‌فرض‌های lib/wakeSleep.ts (اون فایل storage  کلاینتی رو import می‌کنه)
const DEFAULT_WAKE = "09:30";
const DEFAULT_SLEEP = "01:30";

/** ستون @db.Date نیمه‌شب UTC ـه — روز تقویمی با getterهای UTC (نه محلی سرور) */
function dbDayIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hhmmToMin(v: unknown, fallback: string): number {
  const s = typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v) ? v : fallback;
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/** دقیقه‌ی ساعت محلی یک لحظه در منطقه‌ی زمانی کاربر */
function minutesInTz(d: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return g("hour") * 60 + g("minute");
  } catch {
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}

export async function computeUserAchievements(userId: string): Promise<AchievementsPayload | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, timezone: true, goldenSince: true } });
  if (!user) return null;
  const tz = user.timezone || "Asia/Tehran";
  const todayIso = dayInTimezone(tz).date;

  const [settings, dailyRows, sleepRows, stored, workoutRows, foodRows, targetRows, tradeRows, menteeProgramsDone, mentorStudents, rewardRows] = await Promise.all([
    prisma.userSetting.findMany({
      where: { userId, key: { in: ["customOccurrences", "removedOccurrences", "wakeSleepTimes", "sleepGoal"] } },
      select: { key: true, value: true },
    }),
    prisma.dailyEntry.findMany({ where: { userId }, select: { date: true, completedItems: true, wakeUpAt: true } }),
    prisma.sleepEntry.findMany({ where: { userId, sleptAt: { not: null }, wokeAt: { not: null } }, select: { date: true, sleptAt: true, wokeAt: true } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true, unlockedAt: true } }),
    prisma.exerciseLog.findMany({ where: { userId, completed: true }, select: { date: true } }),
    prisma.foodLogEntry.findMany({ where: { userId }, select: { date: true, grams: true, customCalories: true, foodItem: { select: { caloriesPer100g: true } } } }),
    prisma.calorieTarget.findMany({ where: { userId }, select: { dailyTargetKcal: true, effectiveFrom: true, effectiveTo: true } }),
    prisma.tradeEntry.findMany({
      where: { userId },
      select: { openedAt: true, externalId: true, syncLocked: true, note: true, emotionBefore: true, emotionAfter: true, followedPlan: true, checklistDone: true, checklistTotal: true },
    }),
    prisma.mentorProgram.count({ where: { studentId: userId, status: "COMPLETED" } }),
    // داده‌ی آزمایشی (demo_*) روی منتور واقعی اثر نمی‌ذاره
    prisma.mentorship.count({
      where: { mentorId: userId, startedAt: { not: null }, status: { in: ["ACTIVE", "ENDED"] }, student: { OR: [{ username: null }, { NOT: { username: { startsWith: "demo_" } } }] } },
    }),
    prisma.achievementReward.findMany({ where: { userId }, select: { tier: true, usedAt: true } }),
  ]);

  const set = new Map(settings.map((s) => [s.key, s.value as unknown]));
  const custom = (Array.isArray(set.get("customOccurrences")) ? set.get("customOccurrences") : []) as ScheduleOpts["customOccurrences"];
  const removed = (Array.isArray(set.get("removedOccurrences")) ? set.get("removedOccurrences") : []) as string[];
  const ws = (set.get("wakeSleepTimes") ?? {}) as { wake?: string; sleep?: string };
  // ساعت خواب هدف: اول هدف سیستم خواب (lib/sleepGoal.ts)، بعد ساعت روتین
  const sg = (set.get("sleepGoal") ?? {}) as { wake?: string; sleep?: string };

  const daily: Record<string, { tasks: Record<string, boolean>; wakeMin: number | null }> = {};
  for (const r of dailyRows) {
    const tasks = r.completedItems && typeof r.completedItems === "object" && !Array.isArray(r.completedItems) ? (r.completedItems as Record<string, boolean>) : {};
    daily[dbDayIso(r.date)] = { tasks, wakeMin: r.wakeUpAt ? minutesInTz(r.wakeUpAt, tz) : null };
  }

  const sleeps = sleepRows
    .map((s) => ({ iso: dbDayIso(s.date), durationMin: Math.round((s.wokeAt!.getTime() - s.sleptAt!.getTime()) / 60000), bedMin: minutesInTz(s.sleptAt!, tz) }))
    .filter((s) => s.durationMin > 0 && s.durationMin <= 20 * 60); // همون سقف /api/sleep

  const metrics = computeAchievementMetrics({
    todayIso,
    createdAtIso: dayInTimezone(tz, user.createdAt).date,
    opts: { customOccurrences: custom, removedOccurrences: new Set(removed) },
    daily,
    wakeTargetMin: hhmmToMin(ws.wake, DEFAULT_WAKE),
    sleepTargetMin: hhmmToMin(sg.sleep || ws.sleep, DEFAULT_SLEEP),
    sleeps,
    routineItems: custom.length,
    workoutDates: workoutRows.map((r) => dbDayIso(r.date)),
    calorieDays: [...foodRows.reduce((m, r) => {
      const iso = dbDayIso(r.date);
      const kcal = r.customCalories ?? (r.foodItem ? (r.foodItem.caloriesPer100g * r.grams) / 100 : 0);
      return m.set(iso, (m.get(iso) ?? 0) + kcal);
    }, new Map<string, number>())].map(([iso, kcal]) => ({ iso, kcal })),
    calorieTargets: targetRows.map((t) => ({
      fromIso: dayInTimezone(tz, t.effectiveFrom).date,
      toIso: t.effectiveTo ? dayInTimezone(tz, t.effectiveTo).date : null,
      kcal: t.dailyTargetKcal,
    })),
    trades: tradeRows.map((t) => {
      const reflected = !!t.emotionBefore && !!t.emotionAfter && !!t.note?.trim();
      return {
        openedAtMs: t.openedAt.getTime(),
        // معامله‌ی همگام‌شده‌ی متاتریدر فقط وقتی «ژورنال» حساب می‌شه که کاربر واقعا چیزی بهش اضافه کرده باشه
        journaled: !t.externalId || t.syncLocked || reflected || !!t.note?.trim() || t.followedPlan !== null || !!t.emotionBefore,
        checklistFull: (t.checklistTotal ?? 0) > 0 && (t.checklistDone ?? 0) >= (t.checklistTotal ?? 0),
        followedPlan: t.followedPlan,
        reflected,
      };
    }),
    menteeProgramsDone,
    mentorStudents,
  });

  const states = evaluateAchievements(metrics);
  const known = new Map(stored.map((s) => [s.achievementId, s.unlockedAt]));
  const fresh = states.filter((s) => s.unlocked && !known.has(s.id)).map((s) => s.id);
  const now = new Date();
  if (fresh.length) {
    await prisma.userAchievement.createMany({ data: fresh.map((achievementId) => ({ userId, achievementId, unlockedAt: now })), skipDuplicates: true });
    for (const id of fresh) known.set(id, now);
  }

  // باز = الان باز یا قبلا ثبت‌شده (اچیومنت هیچ‌وقت دوباره قفل نمی‌شه)
  const items = ACHIEVEMENTS.map((a) => {
    const st = states.find((s) => s.id === a.id)!;
    const at = known.get(a.id) ?? null;
    const unlocked = st.unlocked || !!at;
    return { id: a.id, unlocked, value: unlocked ? st.goal : st.value, goal: st.goal, unlockedAt: at ? at.toISOString() : null };
  });
  const unlockedCount = items.filter((i) => i.unlocked).length;
  let goldenSince = user.goldenSince;
  if (!goldenSince && unlockedCount === ACHIEVEMENTS.length) {
    goldenSince = now;
    await prisma.user.update({ where: { id: userId }, data: { goldenSince: now } });
  }

  // پاداش تخفیف: سطحی که به آستانه رسید یک بار ثبت می‌شه و دیگه پاک نمی‌شه
  const rewards = await syncRewardRows(userId, unlockedCount, rewardRows);

  return {
    metrics,
    items,
    unlockedCount,
    total: ACHIEVEMENTS.length,
    golden: !!goldenSince,
    goldenSince: goldenSince ? goldenSince.toISOString() : null,
    fresh,
    rewards: rewardStates(rewards),
  };
}

const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => a.id);

async function syncRewardRows<T extends { tier: string; usedAt: Date | null }>(userId: string, unlockedCount: number, rows: T[]) {
  const missing = reachedRewardTiers(unlockedCount, ACHIEVEMENTS.length).filter((t) => !rows.some((r) => r.tier === t));
  if (!missing.length) return rows as { tier: string; usedAt: Date | null }[];
  await prisma.achievementReward.createMany({
    data: missing.map((tier) => ({ userId, tier, percent: rewardPercent(tier) })),
    skipDuplicates: true,
  });
  return prisma.achievementReward.findMany({ where: { userId }, select: { tier: true, usedAt: true } });
}

/**
 * بزرگ‌ترین پاداش اچیومنت باز و مصرف‌نشده برای چک‌اوت. شمارش از
 * UserAchievement (هیچ‌وقت دوباره قفل نمی‌شه) تا لازم نباشه کل متریک‌ها
 * دوباره ساخته بشن؛ اگه آستانه‌ای رد شده ولی هنوز ثبت نشده، همین‌جا ثبت می‌شه.
 */
export async function findAchievementReward(userId: string): Promise<{ id: string; tier: AchievementRewardTier; percent: 20 | 50 } | null> {
  const [count, rows] = await Promise.all([
    prisma.userAchievement.count({ where: { userId, achievementId: { in: ACHIEVEMENT_IDS } } }),
    prisma.achievementReward.findMany({ where: { userId }, select: { id: true, tier: true, usedAt: true } }),
  ]);
  let list = rows;
  if (reachedRewardTiers(count, ACHIEVEMENTS.length).some((t) => !rows.some((r) => r.tier === t))) {
    await syncRewardRows(userId, count, rows);
    list = await prisma.achievementReward.findMany({ where: { userId }, select: { id: true, tier: true, usedAt: true } });
  }
  const best = bestUnusedReward(list);
  if (!best) return null;
  const tier = best.tier as AchievementRewardTier;
  return { id: best.id, tier, percent: rewardPercent(tier) };
}

/** مصرف پاداش بعد از پرداخت موفق — idempotent (فقط اگه هنوز مصرف نشده و مال همین کاربره) */
export async function consumeAchievementReward(rewardId: string, userId: string, subscriptionId: string): Promise<boolean> {
  const r = await prisma.achievementReward.updateMany({ where: { id: rewardId, userId, usedAt: null }, data: { usedAt: new Date(), subscriptionId } });
  return r.count > 0;
}
