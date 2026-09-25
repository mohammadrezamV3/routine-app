// پورت شده از lib/tradeAnalytics.ts (وب) — همان تعریف‌های آماری، خالص و
// بدون وابستگی به Prisma/Next، تا هم صفحه‌ی حساب و هم کارت خلاصه‌ی هاب از
// همین یک منبع استفاده کنند.
//
// تعریف‌ها:
//   • فقط معاملات CLOSED در آمار عملکرد می‌آیند.
//   • نرخ برد = تعداد معاملات سودده ÷ کل معاملات بسته.
//   • فاکتور سود = مجموع سودها ÷ قدرمطلق مجموع ضررها؛ اگر ضرری نبوده null.
//   • افت سرمایه از منحنی تجمعی سود/زیان به ترتیب زمان ورود حساب می‌شود.

import type { StatEntry, TradeGoalType } from "./types";

export type TradeStats = {
  total: number;
  closedCount: number;
  openCount: number;
  netPnl: number;
  balance: number;
  winCount: number;
  lossCount: number;
  breakEvenCount: number;
  winRate: number | null;
  avgWin: number;
  avgLoss: number;
  largestGain: number;
  largestLoss: number;
  maxWinStreak: number;
  maxLossStreak: number;
  avgR: number | null;
  profitFactor: number | null;
  expectancy: number | null;
  maxDrawdown: number;
  goalProgress: number | null;
  goalTarget: number | null;
};

function byOpenedAt(a: StatEntry, b: StatEntry) {
  return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
}

export function computeTradeStats(
  entries: StatEntry[],
  account?: { initialBalance: number; goalType: TradeGoalType; goalValue: number },
): TradeStats {
  const closed = entries.filter((e) => e.status === "CLOSED").slice().sort(byOpenedAt);
  const wins = closed.filter((e) => e.pnl > 0);
  const losses = closed.filter((e) => e.pnl < 0);
  const breakEvens = closed.filter((e) => e.pnl === 0);

  const grossWin = wins.reduce((s, e) => s + e.pnl, 0);
  const grossLoss = losses.reduce((s, e) => s + e.pnl, 0); // منفی
  const netPnl = round2(grossWin + grossLoss);

  let curWin = 0,
    curLoss = 0,
    maxWinStreak = 0,
    maxLossStreak = 0;
  let cumulative = 0,
    peak = 0,
    maxDrawdown = 0;
  for (const e of closed) {
    if (e.pnl > 0) {
      curWin++;
      curLoss = 0;
    } else if (e.pnl < 0) {
      curLoss++;
      curWin = 0;
    } else {
      curWin = 0;
      curLoss = 0;
    }
    if (curWin > maxWinStreak) maxWinStreak = curWin;
    if (curLoss > maxLossStreak) maxLossStreak = curLoss;

    cumulative += e.pnl;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const rValues = closed.map((e) => e.rMultiple).filter((r): r is number => r !== null && r !== undefined);
  const initialBalance = account?.initialBalance ?? 0;
  const balance = round2(initialBalance + netPnl);

  const goalTarget =
    !account || !account.goalValue
      ? null
      : account.goalType === "PERCENT"
        ? round2((initialBalance * account.goalValue) / 100)
        : account.goalValue;

  return {
    total: entries.length,
    closedCount: closed.length,
    openCount: entries.filter((e) => e.status === "OPEN").length,
    netPnl,
    balance,
    winCount: wins.length,
    lossCount: losses.length,
    breakEvenCount: breakEvens.length,
    winRate: closed.length ? Math.round((wins.length / closed.length) * 100) : null,
    avgWin: wins.length ? round2(grossWin / wins.length) : 0,
    avgLoss: losses.length ? round2(grossLoss / losses.length) : 0,
    largestGain: wins.length ? round2(Math.max(...wins.map((e) => e.pnl))) : 0,
    largestLoss: losses.length ? round2(Math.min(...losses.map((e) => e.pnl))) : 0,
    maxWinStreak,
    maxLossStreak,
    avgR: rValues.length ? Math.round((rValues.reduce((s, r) => s + r, 0) / rValues.length) * 100) / 100 : null,
    profitFactor: grossLoss < 0 ? Math.round((grossWin / Math.abs(grossLoss)) * 100) / 100 : null,
    expectancy: closed.length ? round2(netPnl / closed.length) : null,
    maxDrawdown: round2(maxDrawdown),
    goalTarget,
    goalProgress: goalTarget && goalTarget > 0 ? Math.max(0, Math.min(1, netPnl / goalTarget)) : null,
  };
}

/** سود/زیان هر روز — برای رنگ‌کردن خانه‌های تقویم ژورنال */
export function dailyPnl(entries: StatEntry[], isoOf: (d: Date) => string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of entries) {
    if (e.status !== "CLOSED") continue;
    const iso = isoOf(new Date(e.openedAt));
    map[iso] = round2((map[iso] || 0) + e.pnl);
  }
  return map;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
