// محاسبه‌ی خالص «هفته‌ی ترید» برای آنالیز هفتگی بخش ترید: منحنی سرمایه،
// افت سرمایه، بهترین/بدترین معامله، تفکیک نماد/جلسه/جهت/روز/ستاپ/تگ، انضباط و
// ذهن (هزینه‌ی قانون‌شکنی، احساسات، رفتار بعد از ضرر) و مقایسه با هفته‌ی قبل.
// هیچ import سروری نداره (کلاینت هم امنه) و ورودی فقط ردیف‌های معامله‌ست؛
// متن آزاد معامله (یادداشت‌ها) هیچ‌وقت وارد این مدل نمی‌شه.
import { localIso } from "@/lib/weeklyAnalysis/week";

export type TradeWeekRow = {
  openedAt: Date;
  closedAt: Date | null;
  status: "OPEN" | "CLOSED" | "CANCELED";
  result: "PROFIT" | "LOSS" | "BREAKEVEN";
  pnl: number;
  symbol: string;
  direction: "BUY" | "SELL";
  sessions: string[];
  setup: string | null;
  tags: string[];
  rMultiple: number | null;
  checklistDone: number | null;
  checklistTotal: number | null;
  followedPlan: boolean | null;
  stopLoss: number | null;
  entryReasons: string[];
  exitReasons: string[];
  emotionBefore: string | null;
  confidence: number | null;
  currency: string;
};

/** گروه آماری: تعداد، برد، باخت، نرخ برد (null بدون برد/باخت) و سود/زیان خالص */
export type TradeBucket = { key: string; count: number; wins: number; losses: number; winRate: number | null; net: number };

export type TradeBrief = { symbol: string; direction: "BUY" | "SELL"; pnl: number; r: number | null; day: number };

export type TradeCurvePoint = { v: number; d: number };

export type TradeWeek = {
  currency: string | null;
  /** چند ارز مختلف داشتی؛ فقط ارز غالب شمرده شده */
  mixed: boolean;
  /** معامله‌های بسته‌ی شمرده‌شده (ارز غالب) */
  count: number;
  open: number;
  canceled: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number | null;
  net: number;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null;
  expectancy: number | null;
  /** تعداد معامله‌ی دارای R، مجموع و میانگین */
  rCount: number;
  totalR: number | null;
  avgR: number | null;
  maxDrawdown: number;
  maxDrawdownPct: number | null;
  /** شاخص نقطه‌ی قله و ته بزرگ‌ترین افت در curve (null بدون افت) */
  ddRange: [number, number] | null;
  /** منحنی تجمعی: نقطه‌ی صفرم = شروع هفته؛ d = روز هفته (0 شنبه تا 6 جمعه) */
  curve: TradeCurvePoint[];
  bestIdx: number | null;
  worstIdx: number | null;
  best: TradeBrief | null;
  worst: TradeBrief | null;
  /** 7 روز شنبه تا جمعه */
  days: { count: number; net: number }[];
  maxWinStreak: number;
  maxLossStreak: number;
  avgHoldMin: number | null;
  avgHoldWinMin: number | null;
  avgHoldLossMin: number | null;
  bySession: TradeBucket[];
  bySymbol: TradeBucket[];
  byDirection: TradeBucket[];
  byWeekday: TradeBucket[];
  bySetup: TradeBucket[];
  byTag: TradeBucket[];
  discipline: {
    /** معامله‌های واقعی (غیرلغو) */
    total: number;
    plan: { yes: number; of: number } | null;
    checklist: { full: number; of: number } | null;
    stop: { yes: number; of: number } | null;
  };
  mind: {
    emotional: { count: number; net: number };
    /** خارج از قانون = احساسی یا «طبق پلن نبود» */
    broke: { count: number; net: number; avg: number | null };
    kept: { count: number; net: number; avg: number | null };
    byEmotion: TradeBucket[];
    confidenceWin: number | null;
    confidenceLoss: number | null;
    afterLoss: { count: number; wins: number; losses: number; winRate: number | null; net: number; otherWinRate: number | null };
  };
  prev: {
    count: number;
    net: number | null;
    winRate: number | null;
    profitFactor: number | null;
    planPct: number | null;
    stopPct: number | null;
  } | null;
};

export const TRADE_AFTER_LOSS_HOURS = 2;
export const TRADE_MIN_FOR_SPLIT = 3;
const MAX_CURVE = 240;

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const IMPULSIVE = new Set(["FOMO", "REVENGE"]);

export function isEmotionalTrade(t: Pick<TradeWeekRow, "entryReasons" | "exitReasons">): boolean {
  return t.entryReasons.some((r) => IMPULSIVE.has(r)) || t.exitReasons.includes("EMOTIONAL");
}

function bucketize(rows: TradeWeekRow[], keysOf: (t: TradeWeekRow) => string[]): TradeBucket[] {
  const m = new Map<string, TradeBucket>();
  for (const t of rows) {
    for (const key of new Set(keysOf(t))) {
      const b = m.get(key) ?? { key, count: 0, wins: 0, losses: 0, winRate: null, net: 0 };
      b.count++;
      if (t.result === "PROFIT") b.wins++;
      else if (t.result === "LOSS") b.losses++;
      b.net += t.pnl;
      m.set(key, b);
    }
  }
  return [...m.values()].map((b) => ({ ...b, net: r2(b.net), winRate: b.wins + b.losses ? Math.round((b.wins / (b.wins + b.losses)) * 100) : null }));
}

const byCountThenNet = (a: TradeBucket, b: TradeBucket) => b.count - a.count || b.net - a.net;

function dominantCurrency(rows: TradeWeekRow[]): { currency: string | null; mixed: boolean } {
  const c = new Map<string, number>();
  for (const t of rows) c.set(t.currency, (c.get(t.currency) ?? 0) + 1);
  if (!c.size) return { currency: null, mixed: false };
  const sorted = [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { currency: sorted[0][0], mixed: c.size > 1 };
}

type Range = { tz: string; start: string; end: string };

function inRange(rows: TradeWeekRow[], r: Range): TradeWeekRow[] {
  return rows.filter((t) => {
    const d = localIso(r.tz, t.openedAt);
    return d >= r.start && d <= r.end;
  });
}

function dayIndex(r: Range, d: Date): number {
  const iso = localIso(r.tz, d);
  const a = Date.UTC(+r.start.slice(0, 4), +r.start.slice(5, 7) - 1, +r.start.slice(8, 10));
  const b = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.max(0, Math.min(6, Math.round((b - a) / 86_400_000)));
}

function profitFactorOf(closed: TradeWeekRow[]): number | null {
  const gw = closed.filter((t) => t.result === "PROFIT").reduce((a, t) => a + t.pnl, 0);
  const gl = Math.abs(closed.filter((t) => t.result === "LOSS").reduce((a, t) => a + t.pnl, 0));
  return gl > 0 && gw > 0 ? r2(gw / gl) : null;
}

function planPctOf(real: TradeWeekRow[]): number | null {
  const answered = real.filter((t) => t.followedPlan != null);
  return pct(answered.filter((t) => t.followedPlan).length, answered.length);
}

function summarizePrev(rows: TradeWeekRow[], r: Range, currency: string | null): NonNullable<TradeWeek["prev"]> | null {
  const real = inRange(rows, r).filter((t) => t.status !== "CANCELED");
  if (!real.length) return null;
  const closed = real.filter((t) => t.status === "CLOSED");
  const sameCur = currency ? closed.filter((t) => t.currency === currency) : closed;
  const wins = sameCur.filter((t) => t.result === "PROFIT").length;
  const losses = sameCur.filter((t) => t.result === "LOSS").length;
  return {
    count: closed.length,
    net: sameCur.length && currency ? r2(sameCur.reduce((a, t) => a + t.pnl, 0)) : null,
    winRate: pct(wins, wins + losses),
    profitFactor: profitFactorOf(sameCur),
    planPct: planPctOf(real),
    stopPct: pct(real.filter((t) => t.stopLoss != null).length, real.length),
  };
}

/**
 * rows = معامله‌های هفته (و حاشیه‌شون)، prevRows = هفته‌ی قبل. حساب‌های آرشیوی
 * قبلا از ورودی حذف شدن. null یعنی این هفته هیچ معامله‌ی واقعی (غیرلغو) نبود.
 */
export function computeTradeWeek(
  rows: TradeWeekRow[],
  opts: { tz: string; weekStart: string; weekEnd: string; prevRows?: TradeWeekRow[]; prevWeekStart?: string; prevWeekEnd?: string },
): TradeWeek | null {
  const range: Range = { tz: opts.tz, start: opts.weekStart, end: opts.weekEnd };
  const week = inRange(rows, range);
  const real = week.filter((t) => t.status !== "CANCELED");
  if (!real.length) return null;
  const canceled = week.length - real.length;
  const open = real.filter((t) => t.status === "OPEN").length;
  const closedAll = real.filter((t) => t.status === "CLOSED");
  const { currency, mixed } = dominantCurrency(closedAll);
  const closed = (currency ? closedAll.filter((t) => t.currency === currency) : closedAll)
    .slice()
    .sort((a, b) => (a.closedAt ?? a.openedAt).getTime() - (b.closedAt ?? b.openedAt).getTime() || a.openedAt.getTime() - b.openedAt.getTime());

  const wins = closed.filter((t) => t.result === "PROFIT");
  const losses = closed.filter((t) => t.result === "LOSS");
  const breakeven = closed.length - wins.length - losses.length;
  const net = r2(closed.reduce((a, t) => a + t.pnl, 0));

  // منحنی سرمایه + بیشترین افت (قله از صفر شروع می‌شه: شروع هفته)
  const curve: TradeCurvePoint[] = [{ v: 0, d: 0 }];
  let cum = 0;
  let peak = 0;
  let peakIdx = 0;
  let maxDd = 0;
  let ddPeakVal = 0;
  let ddRange: [number, number] | null = null;
  closed.forEach((t, i) => {
    cum += t.pnl;
    curve.push({ v: r2(cum), d: dayIndex(range, t.closedAt ?? t.openedAt) });
    if (cum > peak) { peak = cum; peakIdx = i + 1; }
    const dd = peak - cum;
    if (dd > maxDd + 1e-9) { maxDd = dd; ddRange = [peakIdx, i + 1]; ddPeakVal = peak; }
  });
  curve[0].d = curve[1] ? curve[1].d : 0;

  // بهترین / بدترین معامله
  let bestI = -1;
  let worstI = -1;
  closed.forEach((t, i) => {
    if (t.pnl > 0 && (bestI < 0 || t.pnl > closed[bestI].pnl)) bestI = i;
    if (t.pnl < 0 && (worstI < 0 || t.pnl < closed[worstI].pnl)) worstI = i;
  });
  const brief = (i: number): TradeBrief | null => {
    if (i < 0) return null;
    const t = closed[i];
    return { symbol: t.symbol, direction: t.direction, pnl: r2(t.pnl), r: t.rMultiple != null ? r2(t.rMultiple) : null, day: dayIndex(range, t.openedAt) };
  };

  // روزها (بر اساس روز ورود)
  const days = Array.from({ length: 7 }, () => ({ count: 0, net: 0 }));
  for (const t of closed) {
    const d = days[dayIndex(range, t.openedAt)];
    d.count++;
    d.net += t.pnl;
  }
  for (const d of days) d.net = r2(d.net);

  // رشته‌ها
  let curW = 0, curL = 0, maxW = 0, maxL = 0;
  for (const t of closed) {
    if (t.result === "PROFIT") { curW++; curL = 0; } else if (t.result === "LOSS") { curL++; curW = 0; } else { curW = 0; curL = 0; }
    maxW = Math.max(maxW, curW);
    maxL = Math.max(maxL, curL);
  }

  // مدت نگهداری
  const hold = (t: TradeWeekRow) => (t.closedAt && t.closedAt > t.openedAt ? (t.closedAt.getTime() - t.openedAt.getTime()) / 60_000 : null);
  const holds = (xs: TradeWeekRow[]) => mean(xs.map(hold).filter((x): x is number => x != null));
  const rnd = (n: number | null) => (n == null ? null : Math.round(n));

  // R
  const rs = closed.map((t) => t.rMultiple).filter((x): x is number => x != null && Number.isFinite(x));

  // تفکیک‌ها
  const sessionOrder = ["TOKYO", "LONDON", "NEWYORK", "SYDNEY"];
  const bySession = bucketize(closed, (t) => t.sessions).sort((a, b) => sessionOrder.indexOf(a.key) - sessionOrder.indexOf(b.key));
  const bySymbol = bucketize(closed, (t) => [t.symbol]).sort(byCountThenNet).slice(0, 5);
  const byDirection = bucketize(closed, (t) => [t.direction]).sort((a, b) => (a.key === "BUY" ? -1 : b.key === "BUY" ? 1 : 0));
  const byWeekday = bucketize(closed, (t) => [String(dayIndex(range, t.openedAt))]).sort((a, b) => +a.key - +b.key);
  const bySetup = bucketize(closed, (t) => (t.setup && t.setup.trim() ? [t.setup.trim().slice(0, 40)] : [])).sort(byCountThenNet).slice(0, 5);
  const byTag = bucketize(closed, (t) => t.tags.map((x) => x.slice(0, 30))).sort(byCountThenNet).slice(0, 5);

  // انضباط (روی همه‌ی معامله‌های واقعی، شامل باز)
  const withPlan = real.filter((t) => t.followedPlan != null);
  const withList = real.filter((t) => t.checklistTotal && t.checklistTotal > 0);
  const discipline: TradeWeek["discipline"] = {
    total: real.length,
    plan: withPlan.length ? { yes: withPlan.filter((t) => t.followedPlan).length, of: withPlan.length } : null,
    checklist: withList.length ? { full: withList.filter((t) => (t.checklistDone ?? 0) >= (t.checklistTotal ?? 0)).length, of: withList.length } : null,
    stop: { yes: real.filter((t) => t.stopLoss != null).length, of: real.length },
  };

  // ذهن
  const emotional = closed.filter(isEmotionalTrade);
  const broke = closed.filter((t) => isEmotionalTrade(t) || t.followedPlan === false);
  const kept = closed.filter((t) => !broke.includes(t));
  const sum = (xs: TradeWeekRow[]) => r2(xs.reduce((a, t) => a + t.pnl, 0));
  const avgOf = (xs: TradeWeekRow[]) => (xs.length ? r2(sum(xs) / xs.length) : null);
  const conf = (xs: TradeWeekRow[]) => {
    const v = xs.map((t) => t.confidence).filter((x): x is number => x != null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };

  // بعد از ضرر: ورود در TRADE_AFTER_LOSS_HOURS ساعت بعد از بسته‌شدن یک معامله‌ی ضررده
  const lim = TRADE_AFTER_LOSS_HOURS * 3_600_000;
  const byOpen = closed.slice().sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  const after: TradeWeekRow[] = [];
  const others: TradeWeekRow[] = [];
  for (const t of byOpen) {
    const isAfter = closed.some((l) => l !== t && l.result === "LOSS" && l.closedAt != null && t.openedAt >= l.closedAt && t.openedAt.getTime() - l.closedAt.getTime() <= lim);
    (isAfter ? after : others).push(t);
  }
  const wr = (xs: TradeWeekRow[]) => {
    const w = xs.filter((t) => t.result === "PROFIT").length;
    const l = xs.filter((t) => t.result === "LOSS").length;
    return pct(w, w + l);
  };

  let curvePts = curve;
  if (curvePts.length > MAX_CURVE) {
    const step = Math.ceil(curvePts.length / MAX_CURVE);
    curvePts = curvePts.filter((_, i) => i % step === 0 || i === curvePts.length - 1);
  }

  const out: TradeWeek = {
    currency,
    mixed,
    count: closed.length,
    open,
    canceled,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    winRate: pct(wins.length, wins.length + losses.length),
    net,
    avgWin: wins.length ? r2(mean(wins.map((t) => t.pnl))!) : null,
    avgLoss: losses.length ? r2(mean(losses.map((t) => t.pnl))!) : null,
    profitFactor: profitFactorOf(closed),
    expectancy: closed.length ? r2(net / closed.length) : null,
    rCount: rs.length,
    totalR: rs.length ? r2(rs.reduce((a, b) => a + b, 0)) : null,
    avgR: rs.length ? r2(rs.reduce((a, b) => a + b, 0) / rs.length) : null,
    maxDrawdown: r2(maxDd),
    maxDrawdownPct: maxDd > 0 && ddPeakVal > 0 ? Math.round((maxDd / ddPeakVal) * 100) : null,
    ddRange: maxDd > 0 ? ddRange : null,
    curve: curvePts,
    bestIdx: bestI >= 0 ? bestI + 1 : null,
    worstIdx: worstI >= 0 ? worstI + 1 : null,
    best: brief(bestI),
    worst: brief(worstI),
    days,
    maxWinStreak: maxW,
    maxLossStreak: maxL,
    avgHoldMin: rnd(holds(closed)),
    avgHoldWinMin: rnd(holds(wins)),
    avgHoldLossMin: rnd(holds(losses)),
    bySession,
    bySymbol,
    byDirection,
    byWeekday,
    bySetup,
    byTag,
    discipline,
    mind: {
      emotional: { count: emotional.length, net: sum(emotional) },
      broke: { count: broke.length, net: sum(broke), avg: avgOf(broke) },
      kept: { count: kept.length, net: sum(kept), avg: avgOf(kept) },
      byEmotion: bucketize(closed.filter((t) => t.emotionBefore), (t) => [t.emotionBefore as string]).sort(byCountThenNet),
      confidenceWin: conf(wins),
      confidenceLoss: conf(losses),
      afterLoss: {
        count: after.length,
        wins: after.filter((t) => t.result === "PROFIT").length,
        losses: after.filter((t) => t.result === "LOSS").length,
        winRate: wr(after),
        net: sum(after),
        otherWinRate: wr(others),
      },
    },
    prev: null,
  };
  if (opts.prevRows && opts.prevWeekStart && opts.prevWeekEnd) {
    out.prev = summarizePrev(opts.prevRows, { tz: opts.tz, start: opts.prevWeekStart, end: opts.prevWeekEnd }, currency);
  }
  return out;
}
