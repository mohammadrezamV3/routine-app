// بخش دیتابیس «هفته‌ی ترید» (فقط بخش ترید): معامله‌های هفته و هفته‌ی قبل با
// فیلدهای اضافه (جهت، جلسه، ستاپ، تگ، R، احساس، اطمینان، زمان بسته‌شدن) که آنالیز
// اصلی نمی‌خونه. همه‌ی کوئری‌ها با userId محدودن و حساب‌های آرشیوی بیرون‌ان
// (مثل خود دامنه‌ی ترید). متن آزاد معامله (یادداشت‌ها) هیچ‌وقت انتخاب نمی‌شه.
import { prisma } from "@/lib/prisma";
import { addDaysIso, isoToUtcDate } from "@/lib/weeklyAnalysis/week";
import { computeTradeWeek, type TradeWeek, type TradeWeekRow } from "./tradeWeek";

export async function loadTradeRows(userId: string, fromIso: string, toIso: string): Promise<TradeWeekRow[]> {
  // یک روز حاشیه از هر طرف چون روز محلی تا ±14 ساعت با UTC فرق داره؛ بعدا با localIso فیلتر می‌شه
  const rows = await prisma.tradeEntry.findMany({
    where: {
      userId,
      openedAt: { gte: isoToUtcDate(addDaysIso(fromIso, -1)), lt: isoToUtcDate(addDaysIso(toIso, 2)) },
      account: { archived: false },
    },
    select: {
      openedAt: true, closedAt: true, status: true, result: true, pnl: true, symbol: true, direction: true,
      sessions: true, setup: true, rMultiple: true, checklistDone: true, checklistTotal: true, followedPlan: true,
      stopLoss: true, entryReasons: true, exitReasons: true, emotionBefore: true, confidence: true,
      tags: { select: { name: true } },
      account: { select: { currency: true } },
    },
    take: 3000,
  });
  return rows.map((r) => ({
    openedAt: r.openedAt,
    closedAt: r.closedAt,
    status: r.status,
    result: r.result,
    pnl: r.pnl,
    symbol: r.symbol,
    direction: r.direction,
    sessions: r.sessions,
    setup: r.setup,
    tags: r.tags.map((t) => t.name),
    rMultiple: r.rMultiple,
    checklistDone: r.checklistDone,
    checklistTotal: r.checklistTotal,
    followedPlan: r.followedPlan,
    stopLoss: r.stopLoss,
    entryReasons: r.entryReasons,
    exitReasons: r.exitReasons,
    emotionBefore: r.emotionBefore,
    confidence: r.confidence,
    currency: r.account.currency,
  }));
}

/** هفته‌ی ترید (و مقایسه با هفته‌ی قبل). null = هیچ معامله‌ی واقعی نبود */
export async function loadTradeWeek(userId: string, tz: string, weekStart: string, weekEnd: string): Promise<TradeWeek | null> {
  const prevStart = addDaysIso(weekStart, -7);
  const prevEnd = addDaysIso(weekStart, -1);
  const rows = await loadTradeRows(userId, prevStart, weekEnd);
  return computeTradeWeek(rows, { tz, weekStart, weekEnd, prevRows: rows, prevWeekStart: prevStart, prevWeekEnd: prevEnd });
}
