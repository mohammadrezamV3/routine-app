// اچیومنت‌ها سمتِ سرور: متریک‌ها از دیتابیس ساخته می‌شن (هیچ‌وقت از کلاینت
// پذیرفته نمی‌شن)، هر اچیومنتی که تازه باز شد در UserAchievement ثبت می‌شه و
// دیگه قفل نمی‌شه، و وقتی همه باز شدن User.goldenSince (نامِ طلایی) ست می‌شه.

import { prisma } from "./prisma";
import { dayInTimezone } from "./dashboardServer";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementMetrics } from "./achievements";
import { computeAchievementMetrics } from "./achievementsCompute";
import type { ScheduleOpts } from "./schedule";

export type AchievementsPayload = {
  metrics: AchievementMetrics;
  items: { id: string; unlocked: boolean; value: number; goal: number; unlockedAt: string | null }[];
  unlockedCount: number;
  total: number;
  golden: boolean;
  goldenSince: string | null;
  /** اچیومنت‌هایی که همین درخواست باز شدن (برای جشنِ کلاینت) */
  fresh: string[];
};

// همون پیش‌فرض‌های lib/wakeSleep.ts (اون فایل storage ِ کلاینتی رو import می‌کنه)
const DEFAULT_WAKE = "09:30";
const DEFAULT_SLEEP = "01:30";

/** ستونِ @db.Date نیمه‌شبِ UTC ـه — روزِ تقویمی با getterهای UTC (نه محلیِ سرور) */
function dbDayIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hhmmToMin(v: unknown, fallback: string): number {
  const s = typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v) ? v : fallback;
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/** دقیقه‌ی ساعتِ محلیِ یک لحظه در منطقه‌ی زمانیِ کاربر */
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

  const [settings, dailyRows, sleepRows, stored] = await Promise.all([
    prisma.userSetting.findMany({
      where: { userId, key: { in: ["customOccurrences", "removedOccurrences", "wakeSleepTimes"] } },
      select: { key: true, value: true },
    }),
    prisma.dailyEntry.findMany({ where: { userId }, select: { date: true, completedItems: true, wakeUpAt: true } }),
    prisma.sleepEntry.findMany({ where: { userId, sleptAt: { not: null }, wokeAt: { not: null } }, select: { date: true, sleptAt: true, wokeAt: true } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true, unlockedAt: true } }),
  ]);

  const set = new Map(settings.map((s) => [s.key, s.value as unknown]));
  const custom = (Array.isArray(set.get("customOccurrences")) ? set.get("customOccurrences") : []) as ScheduleOpts["customOccurrences"];
  const removed = (Array.isArray(set.get("removedOccurrences")) ? set.get("removedOccurrences") : []) as string[];
  const ws = (set.get("wakeSleepTimes") ?? {}) as { wake?: string; sleep?: string };

  const daily: Record<string, { tasks: Record<string, boolean>; wakeMin: number | null }> = {};
  for (const r of dailyRows) {
    const tasks = r.completedItems && typeof r.completedItems === "object" && !Array.isArray(r.completedItems) ? (r.completedItems as Record<string, boolean>) : {};
    daily[dbDayIso(r.date)] = { tasks, wakeMin: r.wakeUpAt ? minutesInTz(r.wakeUpAt, tz) : null };
  }

  const sleeps = sleepRows
    .map((s) => ({ iso: dbDayIso(s.date), durationMin: Math.round((s.wokeAt!.getTime() - s.sleptAt!.getTime()) / 60000), bedMin: minutesInTz(s.sleptAt!, tz) }))
    .filter((s) => s.durationMin > 0 && s.durationMin <= 20 * 60); // همون سقفِ /api/sleep

  const metrics = computeAchievementMetrics({
    todayIso,
    createdAtIso: dayInTimezone(tz, user.createdAt).date,
    opts: { customOccurrences: custom, removedOccurrences: new Set(removed) },
    daily,
    wakeTargetMin: hhmmToMin(ws.wake, DEFAULT_WAKE),
    sleepTargetMin: hhmmToMin(ws.sleep, DEFAULT_SLEEP),
    sleeps,
    routineItems: custom.length,
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

  return {
    metrics,
    items,
    unlockedCount,
    total: ACHIEVEMENTS.length,
    golden: !!goldenSince,
    goldenSince: goldenSince ? goldenSince.toISOString() : null,
    fresh,
  };
}
