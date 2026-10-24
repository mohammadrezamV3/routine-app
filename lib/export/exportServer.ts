import { prisma } from "@/lib/prisma";
import { EXPORT_ROW_CAP, type ExportModule } from "./modules";
import { dateTimeWhere, dateWhere, type ExportParams } from "./params";
import { isoTime } from "./dates";
import {
  calorieTable, exerciseTable, reflectionsTable, routineTable, sleepTable, tradeTable, type Table,
} from "./rows";

// خواندن داده‌ی کاربر و ساخت جدول خروجی. همه‌ی کوئری‌ها با userId فیلتر
// می‌شن (IDOR نه) و سقف ردیف دارن. گیت دسترسی در روت انجام می‌شه.

type Q = Pick<ExportParams, "from" | "to" | "accountId">;

async function customOccurrences(userId: string) {
  const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "customOccurrences" } }, select: { value: true } });
  const v = row?.value;
  return (Array.isArray(v) ? v : [])
    .filter((o: any) => o && typeof o.id === "string" && typeof o.name === "string")
    .map((o: any) => ({
      id: o.id as string, name: o.name as string,
      items: Array.isArray(o.items) ? o.items.filter((i: any) => i && typeof i.id === "string" && typeof i.name === "string").map((i: any) => ({ id: i.id as string, name: i.name as string })) : undefined,
    }));
}

export async function buildTable(module: ExportModule, userId: string, q: Q): Promise<Table> {
  const take = EXPORT_ROW_CAP;
  const date = dateWhere(q);
  switch (module) {
    case "routine": {
      const [rows, occs] = await Promise.all([
        prisma.dailyEntry.findMany({
          where: { userId, ...(date ? { date } : {}) }, orderBy: { date: "asc" }, take,
          select: { date: true, completedItems: true, wakeUpAt: true },
        }),
        customOccurrences(userId),
      ]);
      return routineTable(rows, occs);
    }
    case "reflections":
      return reflectionsTable(await prisma.weeklyReflection.findMany({
        where: { userId, ...(date ? { weekStart: date } : {}) }, orderBy: { weekStart: "asc" }, take,
        select: { weekStart: true, wentWell: true, improve: true, mood: true },
      }));
    case "sleep":
      return sleepTable(await prisma.sleepEntry.findMany({
        where: { userId, ...(date ? { date } : {}) }, orderBy: { date: "asc" }, take,
        select: {
          date: true, sleptAt: true, wokeAt: true, targetSleptAt: true, targetWokeAt: true, quality: true, note: true,
          latencyMin: true, awakenings: true, napMin: true, tags: true,
        },
      }));
    case "exercise":
      return exerciseTable(await prisma.exerciseLog.findMany({
        where: { userId, ...(date ? { date } : {}) }, orderBy: { date: "asc" }, take,
        select: {
          date: true, planId: true, completed: true, completedItems: true, startedAt: true, notes: true,
          plan: { select: { goal: true, level: true } },
        },
      }));
    case "calorie":
      return calorieTable(await prisma.foodLogEntry.findMany({
        where: { userId, ...(date ? { date } : {}) }, orderBy: [{ date: "asc" }, { createdAt: "asc" }], take,
        select: {
          date: true, grams: true, mealType: true, customName: true, customCalories: true, proteinG: true, carbsG: true, fatG: true,
          foodItem: { select: { nameFa: true, caloriesPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } },
        },
      }));
    case "trade": {
      const when = dateTimeWhere(q);
      return tradeTable(await prisma.tradeEntry.findMany({
        where: { userId, ...(q.accountId ? { accountId: q.accountId } : {}), ...(when ? { openedAt: when } : {}) },
        orderBy: { openedAt: "asc" }, take,
        // تصویرها عمدا انتخاب نمی‌شن (حجیم‌ان و داده‌ی ساختاری نیستن)
        select: {
          openedAt: true, closedAt: true, symbol: true, direction: true, timeframe: true, status: true, result: true,
          volume: true, volumeUnit: true, pnl: true, riskFree: true, entryPrice: true, exitPrice: true, stopLoss: true, takeProfit: true,
          commission: true, swap: true, riskAmount: true, rMultiple: true, sessions: true, setup: true,
          entryReasons: true, entryReasonNote: true, exitReasons: true, exitReasonNote: true, note: true,
          emotionBefore: true, emotionAfter: true, confidence: true, followedPlan: true,
          checklistName: true, checklistDone: true, checklistTotal: true, checklistSnapshot: true,
          externalSource: true, externalId: true,
          tags: { select: { name: true } },
          account: { select: { name: true, currency: true } },
        },
      }));
    }
  }
}

/** نام فایل ASCII امن: arion-trade-2026-10-24.csv */
export function exportFileName(target: string, ext: "csv" | "json", now = new Date()): string {
  return `arion-${target}-${isoTime(now).slice(0, 10)}.${ext}`;
}

// کلیدهای UserSetting که در خروجی کامل میان (فهرست سفید؛ هیچ کلید E2EE یا
// توکنی از این مسیر نمی‌گذره)
const SETTING_WHITELIST = ["customOccurrences", "removedOccurrences", "wakeSleepTimes", "sleepGoal", "sleepLatency"];

/** پروفایل/تنظیمات/برنامه‌ها/حساب‌های ترید برای خروجی کامل (بدون رمز، توکن، کلید و تصویر) */
export async function buildProfileExtras(userId: string, includeTrade: boolean, includeExercise: boolean) {
  const [user, settings, plans, accounts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true, createdAt: true } }),
    prisma.userSetting.findMany({ where: { userId, key: { in: SETTING_WHITELIST } }, select: { key: true, value: true } }),
    includeExercise
      ? prisma.exercisePlan.findMany({
          where: { userId }, orderBy: { createdAt: "asc" }, take: 500,
          select: { id: true, level: true, goal: true, trainingPhase: true, equipment: true, gymDays: true, isActive: true, startDate: true, planData: true },
        })
      : Promise.resolve(null),
    includeTrade
      ? prisma.tradeAccount.findMany({
          where: { userId }, orderBy: { order: "asc" }, take: 500,
          select: { id: true, name: true, broker: true, type: true, currency: true, initialBalance: true, leverage: true, archived: true, createdAt: true },
        })
      : Promise.resolve(null),
  ]);
  return {
    profile: user ? { name: user.name, username: user.username, createdAt: user.createdAt.toISOString() } : null,
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
    exercisePlans: plans,
    tradeAccounts: accounts,
  };
}
