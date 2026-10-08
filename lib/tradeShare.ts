// محاسبه‌ی خالص «کارنامه‌ی ترید» برای اشتراک — بدون دیتابیس، قابل تست.
//
// قرارداد خروجی در lib/tradeShareTypes.ts است؛ روت GET /api/trade/share فقط
// داده را از دیتابیس می‌کشد و این‌جا می‌دهد.
//
// زمان: «روز» همیشه روز تقویمی به وقت ایران (Asia/Tehran) است. مرز روزها با
// Intl و منطقه‌ی زمانی IANA حساب می‌شود، نه یک اختلاف ثابت هاردکد، تا اگر
// روزی قانون ساعت رسمی عوض شد فقط داده‌ی tz مهم باشد. هفته شنبه تا جمعه و
// ماه = ماه شمسی همان روز (تبدیل‌ها از lib/jalali.ts).
//
// آمار (نرخ برد، فاکتور سود، میانگین R) عمدا از computeTradeStats می‌آید تا
// عددهای کارت با صفحه‌ی حساب یکی باشند.

import { weekdayName, jMonthName, faNum, jalaliToIso, toJalali } from "./jalali";
import { tr } from "./i18n";
import { addDaysIso, isoWeekday, localIso } from "./weeklyAnalysis/week";
import { computeTradeStats } from "./tradeAnalytics";
import type { TradeShareAccount, TradeShareData, TradeSharePeriod } from "./tradeShareTypes";

export const TRADE_SHARE_TZ = "Asia/Tehran";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** «YYYY-MM-DD» معتبر و واقعی (مثلا 2026-02-30 نه) */
export function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 1900 || y > 2200) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** امروز به وقت ایران */
export function tehranToday(now: Date = new Date()): string {
  return localIso(TRADE_SHARE_TZ, now);
}

const offsetFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TRADE_SHARE_TZ,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

/** اختلاف ساعت ایران با UTC در یک لحظه، به میلی‌ثانیه */
function tzOffsetMs(at: number): number {
  const parts = offsetFmt.formatToParts(new Date(at));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** نیمه‌شب یک روز تقویمی ایران → لحظه‌ی UTC (میلی‌ثانیه) */
export function tehranMidnightUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d);
  // دو دور کافی است: اختلاف در خود لحظه‌ی حاصل دوباره چک می‌شود
  let t = wall - tzOffsetMs(wall);
  t = wall - tzOffsetMs(t);
  return t;
}

/** تاریخ میلادی ISO → [سال، ماه، روز] شمسی */
function jalaliOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return toJalali(y, m, d);
}

export type TradeShareRange = {
  period: TradeSharePeriod;
  /** روز اول و آخر بازه (شامل)، تاریخ تقویمی ایران */
  firstDay: string;
  lastDay: string;
  /** همه‌ی روزهای بازه به ترتیب، تاریخ تقویمی ایران */
  days: string[];
  startIso: string;
  endIso: string;
  rangeLabel: string;
};

/**
 * بازه‌ی کارنامه از روی دوره و یک روز داخل آن (تاریخ میلادی به وقت ایران).
 * خروجی [startIso, endIso) به UTC است.
 */
export function resolveTradeShareRange(period: TradeSharePeriod, anchor: string): TradeShareRange {
  if (!isValidIsoDate(anchor)) throw new Error("invalid anchor date");
  let firstDay: string;
  let lastDay: string;
  if (period === "day") {
    firstDay = lastDay = anchor;
  } else if (period === "week") {
    const diffToSat = (isoWeekday(anchor) + 1) % 7; // شنبه (6) → 0
    firstDay = addDaysIso(anchor, -diffToSat);
    lastDay = addDaysIso(firstDay, 6);
  } else {
    const [jy, jm] = jalaliOf(anchor);
    const ny = jm === 12 ? jy + 1 : jy;
    const nm = jm === 12 ? 1 : jm + 1;
    const first = jalaliToIso(jy, jm, 1);
    const nextFirst = jalaliToIso(ny, nm, 1);
    if (!first || !nextFirst) throw new Error("jalali conversion failed");
    firstDay = first;
    lastDay = addDaysIso(nextFirst, -1);
  }
  const days: string[] = [];
  for (let d = firstDay; d <= lastDay; d = addDaysIso(d, 1)) days.push(d);
  return {
    period,
    firstDay,
    lastDay,
    days,
    startIso: new Date(tehranMidnightUtc(firstDay)).toISOString(),
    endIso: new Date(tehranMidnightUtc(addDaysIso(lastDay, 1))).toISOString(),
    rangeLabel: tradeShareRangeLabel(period, firstDay, lastDay),
  };
}

/** برچسب فارسی بازه، ارقام لاتین، بدون اعراب */
export function tradeShareRangeLabel(period: TradeSharePeriod, firstDay: string, lastDay: string): string {
  const [sy, sm, sd] = jalaliOf(firstDay);
  if (period === "day") {
    return `${weekdayName(isoWeekday(firstDay))} ${faNum(sd)} ${jMonthName(sm - 1)} ${faNum(sy)}`;
  }
  if (period === "month") return `${jMonthName(sm - 1)} ${faNum(sy)}`;
  const [ey, em, ed] = jalaliOf(lastDay);
  if (sy !== ey) {
    return tr(
      `هفته‌ی ${faNum(sd)} ${jMonthName(sm - 1)} ${faNum(sy)} تا ${faNum(ed)} ${jMonthName(em - 1)} ${faNum(ey)}`,
      `Week of ${faNum(sd)} ${jMonthName(sm - 1)} ${faNum(sy)} to ${faNum(ed)} ${jMonthName(em - 1)} ${faNum(ey)}`,
    );
  }
  if (sm !== em) {
    return tr(
      `هفته‌ی ${faNum(sd)} ${jMonthName(sm - 1)} تا ${faNum(ed)} ${jMonthName(em - 1)} ${faNum(ey)}`,
      `Week of ${faNum(sd)} ${jMonthName(sm - 1)} to ${faNum(ed)} ${jMonthName(em - 1)} ${faNum(ey)}`,
    );
  }
  return tr(
    `هفته‌ی ${faNum(sd)} تا ${faNum(ed)} ${jMonthName(em - 1)} ${faNum(ey)}`,
    `Week of ${faNum(sd)} to ${faNum(ed)} ${jMonthName(em - 1)} ${faNum(ey)}`,
  );
}

// ── محاسبه ─────────────────────────────────────────────────

export type TradeShareEntryInput = {
  accountId: string;
  status: string;
  pnl: number;
  rMultiple: number | null;
  openedAt: Date | string;
  symbol: string;
};

export type TradeShareAccountInput = TradeShareAccount & { initialBalance: number };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * @param entries معاملات (هر وضعیتی؛ فقط CLOSED داخل بازه حساب می‌شود)
 * @param accounts حساب‌هایی که در این کارنامه حساب می‌شوند
 * @param priorPnlByAccount جمع pnl معاملات بسته‌ی قبل از شروع بازه، به‌ازای هر حساب
 * @param selectedAccountId شناسه‌ی حساب انتخاب‌شده، یا null برای «همه»
 * @param now برای این‌که منحنی هفته/ماه از امروز جلوتر نرود
 */
export function computeTradeShare(
  entries: TradeShareEntryInput[],
  accounts: TradeShareAccountInput[],
  period: TradeSharePeriod,
  range: TradeShareRange,
  priorPnlByAccount: Record<string, number>,
  selectedAccountId: string | null = null,
  now: Date = new Date(),
): TradeShareData {
  const ids = new Set(accounts.map((a) => a.id));
  const start = Date.parse(range.startIso);
  const end = Date.parse(range.endIso);
  const ms = (e: TradeShareEntryInput) => (typeof e.openedAt === "string" ? Date.parse(e.openedAt) : e.openedAt.getTime());

  const closed = entries
    .filter((e) => e.status === "CLOSED" && ids.has(e.accountId))
    .filter((e) => { const t = ms(e); return t >= start && t < end; })
    .sort((a, b) => ms(a) - ms(b));

  const currencies = new Set(accounts.map((a) => a.currency));
  const currencyMixed = currencies.size > 1;
  const currency = currencies.size === 1 ? accounts[0].currency : null;

  const s = computeTradeStats(
    closed.map((e) => ({ status: "CLOSED" as const, pnl: e.pnl, rMultiple: e.rMultiple, openedAt: new Date(ms(e)).toISOString() })),
  );

  const base = accounts.reduce((sum, a) => sum + (a.initialBalance || 0) + (priorPnlByAccount[a.id] || 0), 0);
  const returnPct = currencyMixed || base <= 0 ? null : round2((s.netPnl / base) * 100);

  // منحنی تجمعی
  let curve: number[] = [];
  if (!currencyMixed) {
    curve = [0];
    let cum = 0;
    if (period === "day") {
      for (const e of closed) { cum += e.pnl; curve.push(round2(cum)); }
    } else {
      const today = tehranToday(now);
      const byDay = new Map<string, number>();
      for (const e of closed) {
        const d = localIso(TRADE_SHARE_TZ, new Date(ms(e)));
        byDay.set(d, (byDay.get(d) || 0) + e.pnl);
      }
      for (const d of range.days) {
        if (d > today) break;
        cum += byDay.get(d) || 0;
        curve.push(round2(cum));
      }
    }
  }

  // پرمعامله‌ترین نمادها
  const sym = new Map<string, { count: number; pnl: number }>();
  for (const e of closed) {
    const k = e.symbol;
    const b = sym.get(k) || { count: 0, pnl: 0 };
    b.count++;
    b.pnl += e.pnl;
    sym.set(k, b);
  }
  const topSymbols = Array.from(sym.entries())
    .sort((a, b) => b[1].count - a[1].count || Math.abs(b[1].pnl) - Math.abs(a[1].pnl) || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([symbol, b]) => ({ symbol, count: b.count, netPnl: currencyMixed ? null : round2(b.pnl) }));

  const selected = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : undefined;

  return {
    period,
    startIso: range.startIso,
    endIso: range.endIso,
    rangeLabel: range.rangeLabel,
    account: selected ? { id: selected.id, name: selected.name, color: selected.color, currency: selected.currency } : null,
    accountCount: accounts.length,
    currency,
    currencyMixed,
    stats: {
      trades: s.closedCount,
      wins: s.winCount,
      losses: s.lossCount,
      breakEven: s.breakEvenCount,
      winRate: s.winRate,
      netPnl: currencyMixed ? null : s.netPnl,
      returnPct,
      profitFactor: s.profitFactor,
      avgR: s.avgR,
      bestTrade: currencyMixed || s.winCount === 0 ? null : s.largestGain,
      worstTrade: currencyMixed || s.lossCount === 0 ? null : s.largestLoss,
    },
    curve,
    topSymbols,
  };
}
