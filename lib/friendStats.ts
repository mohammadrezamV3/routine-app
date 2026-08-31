// آمارِ روتینِ دوست‌ها. این‌جا زندگی می‌کند نه داخلِ `app/api/friends/route.ts`
// چون هم آن روت استفاده‌اش می‌کند هم `components/InlineBootstrap.tsx` — و Next
// اجازه نمی‌دهد یک فایلِ `route.ts` چیزی جز هندلرهای HTTP export کند.
import { prisma } from "@/lib/prisma";
import { computeDayStats, tasksForDate, ScheduleOpts } from "@/lib/schedule";
import { isoLocal } from "@/lib/jalali";

// آمارِ روتینِ *همه‌ی* دوست‌ها با تعدادِ ثابتی کوئری.
//
// نسخه‌ی قبلی به‌ازای هر دوست جدا صدا زده می‌شد و هرکدوم ۵ کوئری می‌زد
// (customOccurrences + removedOccurrences + dailyEntryِ امروز + wakeSleepTimes
// + ۹۰ روز DailyEntry). با ۲۰ دوست یعنی ~۱۰۰ کوئری برای یک بار باز کردنِ
// داشبورد. حالا سه کوئریِ دسته‌ای می‌زنیم (`in:` روی کلِ لیستِ دوست‌ها) و
// بقیه‌ی محاسبه در حافظه انجام می‌شه — منطق مو‌به‌مو همونه.
export type RoutineStats = { completed: number; total: number; pct: number; streak: number };

const STREAK_LOOKBACK_DAYS = 90;
// پنجره‌ی اولِ استریک. استریک به محضِ اولین روزِ ناقص می‌شکنه، پس تقریباً
// همیشه فقط چند روزِ آخر خونده می‌شه — ولی کدِ قبلی بی‌قیدوشرط هر ۹۰ روزِ
// *همه‌ی* دوست‌ها رو از قبل می‌کشید.
//
// اندازه‌گیری‌شده: یک درخواستِ /api/friends با ۱۰ دوست، ۹۰۰ ردیفِ DailyEntry
// (با کلِ JSONِ completedItems) می‌خوند تا یه پاسخِ ۲ کیلوبایتی بسازه — و
// همین باعث شده بود این روت ۹ برابر کندتر از بقیه باشه (۵۸ در برابر ۵۱۷
// req/s). حالا اول ۲۱ روز خونده می‌شه؛ فقط برای دوستی که استریکش به لبه‌ی
// همون پنجره رسید (یعنی واقعاً استریکِ بلندی داره) بقیه‌اش هم گرفته می‌شه.
const STREAK_FIRST_WINDOW_DAYS = 21;

export async function routineStatsForUsers(userIds: string[]): Promise<Map<string, RoutineStats>> {
  const out = new Map<string, RoutineStats>();
  if (!userIds.length) return out;

  const now = new Date();
  const todayIso = isoLocal(now);
  const dayStart = (backDays: number) => {
    const d = new Date(now); d.setDate(d.getDate() - backDays); return new Date(isoLocal(d));
  };

  const [settingRows, dailyRows] = await Promise.all([
    prisma.userSetting.findMany({
      where: { userId: { in: userIds }, key: { in: ["customOccurrences", "removedOccurrences"] } },
      select: { userId: true, key: true, value: true },
    }),
    // فقط پنجره‌ی اول — و فقط ستون‌هایی که واقعاً لازمن (id و createdAt و…
    // هیچ‌وقت استفاده نمی‌شدن ولی از دیتابیس میومدن و سریالایز می‌شدن)
    prisma.dailyEntry.findMany({
      where: { userId: { in: userIds }, date: { gte: dayStart(STREAK_FIRST_WINDOW_DAYS), lte: new Date(todayIso) } },
      select: { userId: true, date: true, completedItems: true },
    }),
  ]);

  const settingsByUser = new Map<string, Map<string, unknown>>();
  for (const r of settingRows) {
    if (!settingsByUser.has(r.userId)) settingsByUser.set(r.userId, new Map());
    settingsByUser.get(r.userId)!.set(r.key, r.value);
  }

  const needDeeper: { userId: string; opts: ScheduleOpts }[] = [];
  const dailyByUser = new Map<string, DailyMap>();
  for (const r of dailyRows) {
    if (!dailyByUser.has(r.userId)) dailyByUser.set(r.userId, {});
    dailyByUser.get(r.userId)![isoLocal(r.date)] = { tasks: (r.completedItems as Record<string, boolean>) ?? {} };
  }

  for (const userId of userIds) {
    const settings = settingsByUser.get(userId) ?? new Map();
    const opts: ScheduleOpts = {
      customOccurrences: (settings.get("customOccurrences") as any[]) ?? [],
      removedOccurrences: new Set((settings.get("removedOccurrences") as string[]) ?? []),
    };
    const entries = dailyByUser.get(userId) ?? {};

    const today = entries[todayIso];
    const dayStats = computeDayStats(new Date(), opts, today ? { tasks: today.tasks } : undefined);

    const { streak, hitEdge } = countStreak(entries, opts, STREAK_FIRST_WINDOW_DAYS);
    out.set(userId, { ...dayStats, streak });
    // استریکش تا ته پنجره ادامه داشت؟ پس باید عمیق‌تر نگاه کنیم.
    if (hitEdge) needDeeper.push({ userId, opts });
  }

  // مرحله‌ی دوم — در عمل تقریباً همیشه خالیه، چون استریکِ ۲۱ روزِ کامل نادره.
  if (needDeeper.length) {
    const deepRows = await prisma.dailyEntry.findMany({
      where: {
        userId: { in: needDeeper.map((d) => d.userId) },
        date: { gte: dayStart(STREAK_LOOKBACK_DAYS), lte: new Date(todayIso) },
      },
      select: { userId: true, date: true, completedItems: true },
    });
    const deepByUser = new Map<string, DailyMap>();
    for (const r of deepRows) {
      if (!deepByUser.has(r.userId)) deepByUser.set(r.userId, {});
      deepByUser.get(r.userId)![isoLocal(r.date)] = { tasks: (r.completedItems as Record<string, boolean>) ?? {} };
    }
    for (const d of needDeeper) {
      const { streak } = countStreak(deepByUser.get(d.userId) ?? {}, d.opts, STREAK_LOOKBACK_DAYS);
      const prev = out.get(d.userId);
      if (prev) out.set(d.userId, { ...prev, streak });
    }
  }

  return out;
}

type DailyMap = Record<string, { tasks: Record<string, boolean> }>;

/**
 * روزهای کاملِ پشتِ‌سرهم از دیروز به عقب. `hitEdge` یعنی شمارش تا انتهای
 * پنجره ادامه داشت — یعنی ممکنه استریکِ واقعی از این هم بلندتر باشه و باید
 * با پنجره‌ی بزرگ‌تر دوباره حساب بشه.
 *
 * قبلاً شرطِ روزِ کامل، AND با «بیدارشدنِ سرِوقت» بود — یعنی هر روزی که
 * کاربر این فیچرِ جدا/اختیاری رو دنبال نمی‌کرد (اکثراً)، با اینکه ۱۰۰٪
 * برنامه‌ش رو انجام داده بود، کلِ استریک صفر می‌شد (باگِ گزارش‌شده — استریک
 * عملاً برایِ همه همیشه صفر می‌موند). حالا استریک فقط یعنی «همه‌ی
 * برنامه‌های اون روز انجام شده».
 */
function countStreak(entries: DailyMap, opts: ScheduleOpts, windowDays: number): { streak: number; hitEdge: boolean } {
  let streak = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < windowDays; i++) {
    const key = isoLocal(cursor);
    const expected = tasksForDate(new Date(cursor), opts);
    if (expected.length === 0) { cursor.setDate(cursor.getDate() - 1); continue; }
    const rec = entries[key];
    if (!rec) return { streak, hitEdge: false };
    const doneCount = expected.filter((t) => rec.tasks[t.id]).length;
    if (doneCount === expected.length) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else return { streak, hitEdge: false };
  }
  return { streak, hitEdge: true };
}

