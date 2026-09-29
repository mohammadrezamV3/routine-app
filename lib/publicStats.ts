import { prisma } from "@/lib/prisma";
import { DEMO_USER_WHERE } from "@/lib/demoData";
import { STATS_BASE, type PublicStats } from "@/lib/publicStatsBase";

// عددِ واقعی (بدونِ کاربرانِ آزمایشیِ demo_* و داده‌شون) + پایه‌های lib/publicStatsBase.ts.
//
// کشِ درون‌حافظه‌ای ۱۰ دقیقه‌ای: روتِ عمومی و بدونِ احرازهویته، پس هر بازدیدِ
// لندینگ نباید چند COUNT روی دیتابیس بزنه.
const TTL_MS = 10 * 60 * 1000;
let cache: { value: PublicStats; at: number } | null = null;

const NOT_DEMO = { user: { NOT: DEMO_USER_WHERE } };

async function countReal(): Promise<PublicStats> {
  const [users, exercisePlans, journalEntries, programRows] = await Promise.all([
    prisma.user.count({ where: { NOT: DEMO_USER_WHERE } }),
    prisma.exercisePlan.count({ where: NOT_DEMO }),
    prisma.tradeEntry.count({ where: NOT_DEMO }),
    // برنامه‌های روتین آرایه‌ی JSON ِ تنظیمِ customOccurrences ِ هر کاربرن
    prisma.userSetting.findMany({ where: { key: "customOccurrences", ...NOT_DEMO }, select: { value: true } }),
  ]);
  const routinePrograms = programRows.reduce((n, r) => n + (Array.isArray(r.value) ? r.value.length : 0), 0);
  return { users, exercisePlans, routinePrograms, journalEntries };
}

export async function getPublicStats(): Promise<PublicStats> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const real = await countReal();
    const value = Object.fromEntries(
      (Object.keys(STATS_BASE) as (keyof PublicStats)[]).map((k) => [k, real[k] + STATS_BASE[k]]),
    ) as PublicStats;
    cache = { value, at: Date.now() };
  } catch {
    // دیتابیس در دسترس نبود: آخرین مقدارِ کش‌شده یا دستِ‌کم خودِ پایه‌ها.
    if (!cache) return { ...STATS_BASE };
  }
  return cache!.value;
}
