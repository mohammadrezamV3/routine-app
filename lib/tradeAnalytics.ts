// محاسبه‌ی آمار یک حساب از روی لیست معاملاتش.
//
// عمدا یک تابع خالص مشترک است، نه SQL: هم صفحه‌ی حساب (کلاینت) و هم
// خلاصه‌ی کارت لیست حساب‌ها (سرور) از همین استفاده می‌کنند، پس هیچ‌وقت
// دو تعریف متفاوت از «نرخ برد» در دو جای برنامه وجود ندارد.
//
// تعریف‌ها (چون هرکدام چند برداشت دارند، این‌جا تثبیت می‌شوند):
//   • فقط معاملات CLOSED در آمار عملکرد می‌آیند؛ OPEN هنوز نتیجه ندارد و
//     CANCELED اصلا وارد بازار نشده.
//   • نرخ برد = تعداد معاملات سودده ÷ کل معاملات بسته (سربه‌سرها در
//     مخرج می‌مانند — پنهان‌کردنشان نرخ را مصنوعی بالا می‌برد).
//   • فاکتور سود = مجموع سودها ÷ قدرمطلق مجموع ضررها؛ اگر ضرری نبوده
//     null است نه بی‌نهایت.
//   • افت سرمایه از منحنی تجمعی سود/زیان به ترتیب زمان ورود حساب می‌شود.

import type { TradeEntry, TradeAccount, TradeSession, TradeStatKey } from "./tradeTypes";

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

/** حداقل فیلدهایی که آمار به آن نیاز دارد — تا صداکننده مجبور نباشد کل
 *  ردیف معامله (با همه‌ی متن‌ها و دلایل) را از دیتابیس بکشد. */
export type StatEntry = Pick<TradeEntry, "status" | "pnl" | "rMultiple" | "openedAt">;

function byOpenedAt(a: StatEntry, b: StatEntry) {
  return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
}

export function computeTradeStats(entries: StatEntry[], account?: Pick<TradeAccount, "initialBalance" | "goalType" | "goalValue">): TradeStats {
  const closed = entries.filter((e) => e.status === "CLOSED").slice().sort(byOpenedAt);
  const wins = closed.filter((e) => e.pnl > 0);
  const losses = closed.filter((e) => e.pnl < 0);
  const breakEvens = closed.filter((e) => e.pnl === 0);

  const grossWin = wins.reduce((s, e) => s + e.pnl, 0);
  const grossLoss = losses.reduce((s, e) => s + e.pnl, 0); // منفی
  const netPnl = round2(grossWin + grossLoss);

  let curWin = 0, curLoss = 0, maxWinStreak = 0, maxLossStreak = 0;
  let cumulative = 0, peak = 0, maxDrawdown = 0;
  for (const e of closed) {
    if (e.pnl > 0) { curWin++; curLoss = 0; }
    else if (e.pnl < 0) { curLoss++; curWin = 0; }
    else { curWin = 0; curLoss = 0; }
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

/** تجزیه‌ی عملکرد بر اساس یک کلید دسته‌ای — پایه‌ی همه‌ی گزارش‌های «کدام الگو بهتر جواب داده» */
export type Breakdown = { key: string; label: string; count: number; netPnl: number; winRate: number | null; avgR: number | null };

export function breakdownBy(
  entries: TradeEntry[],
  keyOf: (e: TradeEntry) => string[] | string | null,
  labelOf: (key: string) => string
): Breakdown[] {
  const buckets = new Map<string, TradeEntry[]>();
  for (const e of entries) {
    if (e.status !== "CLOSED") continue;
    const raw = keyOf(e);
    const keys = raw === null ? [] : Array.isArray(raw) ? raw : [raw];
    for (const k of keys) {
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(e);
    }
  }
  return Array.from(buckets.entries())
    .map(([key, list]) => {
      const s = computeTradeStats(list);
      return { key, label: labelOf(key), count: list.length, netPnl: s.netPnl, winRate: s.winRate, avgR: s.avgR };
    })
    .sort((a, b) => b.count - a.count);
}

export function sessionBreakdown(entries: TradeEntry[], labels: Record<TradeSession, string>): Breakdown[] {
  return breakdownBy(entries, (e) => e.sessions, (k) => labels[k as TradeSession] ?? k);
}

/** سود/زیان هر روز — برای رنگ‌کردن خانه‌های تقویم ژورنال */
export function dailyPnl(entries: TradeEntry[], isoOf: (d: Date) => string): Record<string, number> {
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

/** مقدار نمایشی هر کارت آماری — تا صفحه‌ی حساب یک switch بلند نداشته باشد */
export function statValue(key: TradeStatKey, s: TradeStats): { value: string; positive?: boolean } | null {
  switch (key) {
    case "balance": return { value: s.balance.toFixed(2), positive: s.balance >= 0 };
    case "monthTotal": return { value: s.netPnl.toFixed(2), positive: s.netPnl >= 0 };
    case "total": return { value: String(s.total) };
    case "winRate": return s.winRate === null ? { value: "—" } : { value: `${s.winRate}٪`, positive: s.winRate >= 50 };
    case "avgWin": return { value: s.avgWin.toFixed(2), positive: true };
    case "avgLoss": return { value: s.avgLoss.toFixed(2), positive: false };
    case "largestGain": return { value: s.largestGain.toFixed(2), positive: true };
    case "largestLoss": return { value: s.largestLoss.toFixed(2), positive: false };
    case "maxWinStreak": return { value: String(s.maxWinStreak), positive: true };
    case "maxLossStreak": return { value: String(s.maxLossStreak), positive: false };
    case "avgR": return s.avgR === null ? { value: "—" } : { value: `${s.avgR > 0 ? "+" : ""}${s.avgR}`, positive: s.avgR >= 0 };
    case "profitFactor": return s.profitFactor === null ? { value: "—" } : { value: String(s.profitFactor), positive: s.profitFactor >= 1 };
    case "expectancy": return s.expectancy === null ? { value: "—" } : { value: s.expectancy.toFixed(2), positive: s.expectancy >= 0 };
    case "maxDrawdown": return { value: s.maxDrawdown.toFixed(2), positive: false };
    default: return null; // goalRing جداگانه رندر می‌شود
  }
}
