// سازنده‌ی پاسخ GET /api/trade/hub — سمت سرور.
//
// قواعد (CLAUDE.md، همون قواعد lib/dashboardServer.ts):
//   • هر کوئری با userId محدود می‌شه (بدون IDOR)، Prisma پارامتری، بدون raw SQL.
//   • تقویم همیشه از جدول خودمون خونده می‌شه و تازه‌سازی پس‌زمینه‌ایه — روی مسیر
//     لود منتظر هیچ سرویس بیرونی نمی‌مونیم و هیچ تماس بیرونی این‌جا نیست.
//   • هر بخش با فلگ پنل ادمین خودش گیت می‌شه (روت گیت ماژول TRADE رو انجام می‌ده)؛
//     خاموش → null. هر بخش جدا try/catch داره تا خطای یکی کل هاب رو نخوابونه.
//   • متن معامله/عکس/یادداشت خصوصی منتور هیچ‌وقت select نمی‌شن؛ فقط یادداشت
//     ترید خود کاربر (برای خلاصه‌ی یک خطی).
//   • محاسبه‌ی آمار از buildTrade داشبورد استفاده می‌کنه تا اعداد با داشبورد یکی باشن.

import { prisma } from "./prisma";
import { buildTrade, safe } from "./dashboardServer";
import { ensureFreshCalendar } from "./economicCalendar";
import type { FeatureKey } from "./featureFlags";
import type { HubAccount, HubEvent, HubKpi, TradeHubData } from "./tradeHubTypes";
import { accountGrowthPct } from "./tradeHubCompute";
import { buildChart, buildChecklists, buildMetatrader, buildNotes } from "./tradeToolsServer";

type Ctx = { userId: string; date: string; tz: number };
type Features = Record<FeatureKey, boolean>;

const DAY = 86_400_000;
const EVENT_SELECT = { id: true, title: true, currency: true, impact: true, occursAt: true } as const;

const toEvent = (r: { id: string; title: string; currency: string; impact: string; occursAt: Date }): HubEvent => ({
  id: r.id,
  title: r.title,
  currency: r.currency,
  impact: r.impact as HubEvent["impact"],
  occursAt: r.occursAt.toISOString(),
});

// ── ترید: آمار + حساب‌ها ─────────────────────────────────────
async function buildStats(ctx: Ctx): Promise<{ kpi: HubKpi; accounts: { items: HubAccount[]; total: number } }> {
  const t = await buildTrade(ctx);
  // نماد معامله‌های باز (یکتا) فقط وقتی معامله‌ی باز هست
  const openSymbols = t.openTrades
    ? (await prisma.tradeEntry.findMany({
        where: { userId: ctx.userId, status: "OPEN", account: { archived: false } },
        distinct: ["symbol"],
        orderBy: { openedAt: "desc" },
        take: 3,
        select: { symbol: true },
      })).map((r) => r.symbol)
    : [];
  return {
    kpi: {
      currency: t.sumCurrency,
      accountCount: t.accountCount,
      today: t.today,
      winRate: t.month.winRate,
      profitFactor: t.month.profitFactor,
      closed30: t.month.count,
      openTrades: t.openTrades,
      openSymbols,
    },
    accounts: {
      total: t.accountCount,
      items: t.accounts.slice(0, 3).map((a) => ({
        id: a.id, name: a.name, color: a.color, currency: a.currency, balance: a.balance,
        growthPct: accountGrowthPct(a.balance, a.netPnl),
      })),
    },
  };
}

// ── تقویم اقتصادی (از جدول خودمون) ───────────────────────────
async function buildNews(): Promise<{ nextNews: HubEvent | null; events: HubEvent[] }> {
  // تازه‌سازی پس‌زمینه‌ایه و منتظرش نمی‌مونیم (همون قاعده‌ی buildCalendar داشبورد)
  void ensureFreshCalendar(prisma).catch(() => {});
  const from = new Date();
  const [next, upcoming] = await Promise.all([
    prisma.economicEvent.findFirst({
      where: { impact: "HIGH", occursAt: { gte: from, lte: new Date(from.getTime() + 14 * DAY) } },
      orderBy: { occursAt: "asc" },
      select: EVENT_SELECT,
    }),
    prisma.economicEvent.findMany({
      where: { impact: { in: ["HIGH", "MEDIUM"] }, occursAt: { gte: from, lte: new Date(from.getTime() + 7 * DAY) } },
      orderBy: { occursAt: "asc" },
      take: 3,
      select: EVENT_SELECT,
    }),
  ]);
  return { nextNews: next ? toEvent(next) : null, events: upcoming.map(toEvent) };
}

/**
 * همه‌ی داده‌ی هاب ترید برای یک کاربر. گیت ماژول TRADE و فلگ کل بخش با
 * صدازننده‌ست (روت)؛ این‌جا فقط فلگ هر زیربخش.
 */
export async function buildTradeHub(userId: string, day: { date: string; tz: number }, features: Features): Promise<TradeHubData> {
  const ctx: Ctx = { userId, date: day.date, tz: day.tz };
  const errors: string[] = [];
  const none = Promise.resolve(null);

  const [stats, news, chart, checklists, notes, metatrader] = await Promise.all([
    features.tradeJournal ? safe("stats", errors, () => buildStats(ctx)) : none,
    features.economicCalendar ? safe("calendar", errors, () => buildNews()) : none,
    features.tradeChart ? safe("chart", errors, () => buildChart(ctx)) : none,
    features.tradeChecklists ? safe("checklists", errors, () => buildChecklists(ctx)) : none,
    features.tradeNotes ? safe("notes", errors, () => buildNotes(ctx)) : none,
    features.metatrader ? safe("metatrader", errors, () => buildMetatrader(ctx)) : none,
  ]);

  return {
    generatedAt: new Date().toISOString(),
    kpi: stats?.kpi ?? null,
    accounts: stats?.accounts ?? null,
    nextNews: news?.nextNews ?? null,
    calendar: news ? { events: news.events } : null,
    chart,
    checklists,
    notes,
    metatrader,
    errors,
  };
}
