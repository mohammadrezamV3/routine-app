import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadAccountMoney } from "@/lib/tradeCashflowServer";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { TRADE_SHARE_PERIODS, type TradeSharePeriod, type TradeShareResponse } from "@/lib/tradeShareTypes";
import { computeTradeShare, isValidIsoDate, resolveTradeShareRange, tehranToday } from "@/lib/tradeShare";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";

// کارنامه‌ی ترید برای اشتراک تصویر: یک روز/هفته/ماه شمسی، یک حساب یا همه.
// فقط خواندن؛ محاسبه در lib/tradeShare.ts و قرارداد در lib/tradeShareTypes.ts.

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

// GET /api/trade/share?period=day|week|month&date=YYYY-MM-DD&account=<id>|all
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeShare"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  if (!(await checkRateLimit(`trade-share:${userId}`, 60, 60 * 1000))) {
    return json({ error: "تعداد درخواست‌ها زیاد است، کمی بعد دوباره امتحان کن" }, 429);
  }

  const sp = req.nextUrl.searchParams;
  const periodRaw = sp.get("period") || "day";
  if (!(TRADE_SHARE_PERIODS as readonly string[]).includes(periodRaw)) {
    return json({ error: "بازه نامعتبر است" }, 400);
  }
  const period = periodRaw as TradeSharePeriod;

  const date = sp.get("date") || tehranToday();
  if (!isValidIsoDate(date)) return json({ error: "تاریخ نامعتبر است" }, 400);

  const accountParam = sp.get("account") || "all";
  if (accountParam.length > 64) return json({ error: "حساب پیدا نشد" }, 404);

  // همان ترتیب فهرست حساب‌ها (app/api/trade/accounts)، فقط حساب‌های فعال
  const accounts = await prisma.tradeAccount.findMany({
    where: { userId, archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, color: true, currency: true, initialBalance: true },
  });

  // حساب باید مال همین کاربر و آرشیونشده باشد — وگرنه 404 (جلوگیری از IDOR)
  const selected = accountParam === "all" ? accounts : accounts.filter((a) => a.id === accountParam);
  if (accountParam !== "all" && selected.length === 0) return json({ error: "حساب پیدا نشد" }, 404);

  const range = resolveTradeShareRange(period, date);
  const ids = selected.map((a) => a.id);
  const start = new Date(range.startIso);

  // فقط ستون‌های لازم؛ هیچ متن/عکس/یادداشتی کشیده نمی‌شود
  const [entries, prior] = ids.length
    ? await Promise.all([
        prisma.tradeEntry.findMany({
          where: {
            userId,
            accountId: { in: ids },
            status: "CLOSED",
            openedAt: { gte: start, lt: new Date(range.endIso) },
          },
          select: { accountId: true, status: true, pnl: true, rMultiple: true, openedAt: true, symbol: true },
          orderBy: { openedAt: "asc" },
          take: 20_000,
        }),
        prisma.tradeEntry.groupBy({
          by: ["accountId"],
          where: { userId, accountId: { in: ids }, status: "CLOSED", openedAt: { lt: start } },
          _sum: { pnl: true },
        }),
      ])
    : [[], []];

  const priorPnlByAccount: Record<string, number> = {};
  for (const p of prior) priorPnlByAccount[p.accountId] = p._sum.pnl ?? 0;
  // موجودی ابتدای بازه گردش پول متاتریدر قبل از شروع بازه (واریز/برداشت/هزینه) رو هم داره
  if (ids.length) {
    try {
      const priorCash = await prisma.tradeCashflow.groupBy({
        by: ["accountId"],
        where: { userId, accountId: { in: ids }, occurredAt: { lt: start } },
        _sum: { amount: true },
      });
      for (const c of priorCash) priorPnlByAccount[c.accountId] = (priorPnlByAccount[c.accountId] ?? 0) + (c._sum.amount ?? 0);
    } catch (e) {
      console.error("[trade/share] cashflows failed", e);
    }
  }
  // اگه بالانس اولیه از اولین واریز متاتریدر میاد (lib/tradeCashflowServer.ts)،
  // همون واریز بالا جزو گردش پول قبل از بازه حساب شده؛ عدد دستی دوباره جمع نمی‌شه
  const money = await loadAccountMoney(selected);
  const base = selected.map((a) => (money.get(a.id)?.initialFromMt ? { ...a, initialBalance: 0 } : a));

  const data = computeTradeShare(
    entries,
    base,
    period,
    range,
    priorPnlByAccount,
    accountParam === "all" ? null : accountParam,
  );

  const body: TradeShareResponse = {
    data,
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, color: a.color, currency: a.currency })),
  };
  return json(body);
}
