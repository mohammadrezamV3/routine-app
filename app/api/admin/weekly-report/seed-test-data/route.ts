import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isoLocal } from "@/lib/jalali";
import { getOrGenerateWeeklyReport } from "@/lib/weeklyReport/snapshot";

// POST /api/admin/weekly-report/seed-test-data — فقط سوپریوزر، فقط روی
// حساب خود همون سوپریوزر (هیچ‌وقت روی یه کاربر واقعی دیگه). چون
// Trend/Baseline/Correlation به چند هفته داده نیاز دارن و روی یه حساب
// تازه‌ساز چیزی برای تست نیست، این روت ۱۰ هفته داده‌ی مصنوعی (با نوسان
// عمدی — نه یک عدد ثابت — تا Streak/Outlier/Correlation واقعا چیزی برای
// پیداکردن داشته باشن) برای پنج دامنه می‌سازه.
//
// ایمن برای اجرای مکرر: قبل از ساختن، فقط همون بازه‌ی ۱۰هفته‌ای خود
// این ردیف‌ها (Daily/Exercise/FoodLog/Trade) پاک و دوباره ساخته می‌شن —
// نه کل تاریخچه‌ی حساب ادمین.

const WEEKS = 10;
const DAYS = WEEKS * 7;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

export async function POST() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setDate(since.getDate() - DAYS);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const days: Date[] = [];
  for (let d = new Date(since); d <= yesterday; d.setDate(d.getDate() + 1)) days.push(new Date(d));

  // --- پاک‌سازی بازه (فقط همین کاربر، فقط همین بازه) ---
  await Promise.all([
    prisma.dailyEntry.deleteMany({ where: { userId, date: { gte: since, lte: yesterday } } }),
    prisma.exerciseLog.deleteMany({ where: { userId, date: { gte: since, lte: yesterday } } }),
    prisma.foodLogEntry.deleteMany({ where: { userId, date: { gte: since, lte: yesterday } } }),
    prisma.tradeEntry.deleteMany({ where: { userId, openedAt: { gte: since, lte: yesterday } } }),
  ]);

  // --- روتین: هرروز ۵ تا ۸ آیتم الکی، با نرخ تکمیل نوسان‌دار +
  // یه استریک عمدی ۴روزه‌ی ۱۰۰٪ نزدیک انتها تا Win واقعی دربیاد ---
  const routineData = days.map((date, i) => {
    const itemCount = randInt(5, 8);
    const isStreakWindow = i >= days.length - 6 && i < days.length - 2;
    const completionRate = isStreakWindow ? 1 : rand(0.35, 0.95);
    const completedItems: Record<string, boolean> = {};
    for (let k = 0; k < itemCount; k++) completedItems[`seed-${k}`] = Math.random() < completionRate;
    return { userId, date, completedItems };
  });
  await prisma.dailyEntry.createMany({ data: routineData });

  // --- بدنسازی: یه پلن فعال با ۳ روز باشگاه در هفته ---
  let plan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { startDate: "desc" } });
  const gymDayNames = ["شنبه", "دوشنبه", "چهارشنبه"];
  if (!plan) {
    plan = await prisma.exercisePlan.create({
      data: {
        userId, level: "intermediate", goal: "داده‌ی تست گزارش هفتگی", gymDays: gymDayNames,
        trainingPhase: "maintenance", isActive: true, planData: gymDayNames.map((d) => ({ day: d, focus: "تست", items: ["حرکت نمونه ۳×۱۰"] })),
      },
    });
  } else if (!Array.isArray(plan.gymDays) || (plan.gymDays as string[]).length === 0) {
    plan = await prisma.exercisePlan.update({ where: { id: plan.id }, data: { gymDays: gymDayNames } });
  }
  const FA_WEEKDAY_BY_JSDAY = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
  const activeGymDays = new Set((plan.gymDays as string[]) || gymDayNames);
  const exerciseData = days
    .filter((d) => activeGymDays.has(FA_WEEKDAY_BY_JSDAY[d.getDay()]))
    .map((date) => ({ userId, planId: plan!.id, date, completed: Math.random() < 0.75 }));
  if (exerciseData.length) await prisma.exerciseLog.createMany({ data: exerciseData });

  // --- ترید: ۱ تا ۳ معامله‌ی تصادفی در هفته، نرخ برد ~۶۰٪ ---
  // ماژول ترید حالا حساب‌محور است — پس داده‌ی تست هم اول یک حساب تستی
  // لازم دارد تا معامله جایی برای نشستن داشته باشد.
  let tradeAccount = await prisma.tradeAccount.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!tradeAccount) {
    tradeAccount = await prisma.tradeAccount.create({
      data: { userId, name: "حساب تست گزارش هفتگی", type: "DEMO", currency: "USD", initialBalance: 10_000 },
    });
  }
  const tradeData: Prisma.TradeEntryCreateManyInput[] = [];
  for (let w = 0; w < WEEKS; w++) {
    const tradesThisWeek = randInt(1, 3);
    for (let t = 0; t < tradesThisWeek; t++) {
      const day = days[randInt(w * 7, Math.min(w * 7 + 6, days.length - 1))];
      if (!day) continue;
      const entryPrice = rand(1.05, 1.15);
      const win = Math.random() < 0.6;
      const exitPrice = win ? entryPrice * rand(1.005, 1.02) : entryPrice * rand(0.98, 0.995);
      const lotSize = rand(0.1, 1);
      const pnl = Math.round((exitPrice - entryPrice) * lotSize * 1000 * 100) / 100;
      tradeData.push({
        userId, accountId: tradeAccount.id,
        symbol: pick(["EURUSD", "XAUUSD", "GBPUSD"]),
        direction: pick(["BUY", "SELL"]) as "BUY" | "SELL",
        entryPrice, exitPrice, volume: lotSize, volumeUnit: "LOT",
        result: pnl > 0 ? "PROFIT" : pnl < 0 ? "LOSS" : "BREAKEVEN",
        status: "CLOSED", pnl,
        openedAt: day, closedAt: day,
      });
    }
  }
  if (tradeData.length) await prisma.tradeEntry.createMany({ data: tradeData });

  // --- یادگیری: یه رودمپ نمونه با ۸ ایستگاه، ۵تاش انجام‌شده ---
  let roadmap = await prisma.roadmap.findFirst({ where: { userId } });
  const stations = Array.from({ length: 8 }, (_, i) => ({ title: `مرحله‌ی ${i + 1}`, items: ["نکته‌ی نمونه"], done: i < 5 }));
  if (!roadmap) {
    roadmap = await prisma.roadmap.create({ data: { userId, topic: "داده‌ی تست", title: "رودمپ تست گزارش هفتگی", stations } });
  } else {
    await prisma.roadmap.update({ where: { id: roadmap.id }, data: { stations, updatedAt: new Date() } });
  }

  // --- تغذیه: هدف روزانه + ۲ تا ۴ وعده در روز با نوسان حول هدف ---
  const dailyTargetKcal = 2200;
  const existingTarget = await prisma.calorieTarget.findFirst({ where: { userId }, orderBy: { effectiveFrom: "desc" } });
  if (!existingTarget) {
    await prisma.calorieTarget.create({ data: { userId, dailyTargetKcal, goal: "maintain", effectiveFrom: since } });
  }
  const foodData: { userId: string; customName: string; customCalories: number; grams: number; date: Date; mealType: string }[] = [];
  for (const date of days) {
    if (Math.random() < 0.15) continue; // چند روز عمدا بدون ثبت، برای تست Missing-vs-Zero
    const meals = randInt(2, 4);
    const perMealAvg = (dailyTargetKcal * rand(0.85, 1.2)) / meals;
    for (let m = 0; m < meals; m++) {
      foodData.push({
        userId, customName: `وعده‌ی تستی ${m + 1}`, customCalories: Math.round(perMealAvg * rand(0.8, 1.2)),
        grams: randInt(150, 400), date, mealType: pick(["breakfast", "lunch", "dinner", "snack"]),
      });
    }
  }
  if (foodData.length) await prisma.foodLogEntry.createMany({ data: foodData });

  // --- ریجنریت فوری چندهفته‌ی اخیر تا وقت باز‌کردن صفحه بلافاصله کامل باشه ---
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  const timezone = user?.timezone || "Asia/Tehran";
  for (const offset of [-1, -2, -3]) {
    try {
      await getOrGenerateWeeklyReport(userId, timezone, true, offset, true);
    } catch {
      // اگه AI در دسترس نبود هم مهم نیست — بخش آماری Deterministic هنوز درسته
    }
  }

  return NextResponse.json({ ok: true, days: days.length, weeksSeeded: WEEKS });
}
