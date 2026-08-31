import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import { sessionsAt } from "@/lib/forexSessions";
import { computeR } from "@/lib/tradeSymbols";
import { hashSecret, normalizeMtTrades } from "@/lib/metatrader";

// POST /api/mt/sync — اندپوینتی که EA هر چند دقیقه صدا می‌زند.
//   Authorization: Bearer <token>
//   { balance, equity, currency, trades: [...] }
//
// احراز هویت فقط با توکن است (نه سشن). چون هر درخواست مستقیم روی دیتابیس
// چک می‌شود، ابطالِ توکن از پنل بلافاصله اثر می‌کند — برخلافِ یک JWTِ
// امضاشده که تا انقضایش معتبر می‌ماند.
//
// معاملات با کلیدِ یکتای (accountId, externalId) upsert می‌شوند، پس اجرای
// دوباره‌ی sync (که در EA کاملاً عادی است) هیچ‌وقت معامله‌ی تکراری نمی‌سازد.

const SYNC_LIMIT = 30;
const SYNC_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!checkRateLimit(`mt-sync:${ip}`, SYNC_LIMIT, SYNC_WINDOW_MS)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const link = await prisma.tradeMtLink.findUnique({
    where: { tokenHash: hashSecret(token) },
    select: { id: true, userId: true, accountId: true, revokedAt: true, platform: true },
  });
  if (!link || link.revokedAt) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const trades = normalizeMtTrades(body?.trades);

  let created = 0;
  let updated = 0;

  for (const t of trades) {
    // سود/زیانِ خالص همان چیزی است که خودِ ترمینال گزارش می‌کند؛ کمیسیون و
    // سواپ جدا نگه داشته می‌شوند تا در UI دیده شوند، ولی دوباره از سود کم
    // نمی‌شوند (وگرنه دوبار حساب می‌شد).
    const pnl = Math.round(t.profit * 100) / 100;
    const data = {
      symbol: t.symbol,
      direction: t.direction,
      volume: t.volume,
      volumeUnit: "LOT",
      openedAt: t.openTime,
      closedAt: t.closeTime,
      status: (t.closed ? "CLOSED" : "OPEN") as "CLOSED" | "OPEN",
      result: (pnl > 0 ? "PROFIT" : pnl < 0 ? "LOSS" : "BREAKEVEN") as "PROFIT" | "LOSS" | "BREAKEVEN",
      pnl: t.closed ? pnl : 0,
      entryPrice: t.openPrice,
      exitPrice: t.closePrice,
      stopLoss: t.stopLoss,
      takeProfit: t.takeProfit,
      commission: t.commission,
      swap: t.swap,
      sessions: sessionsAt(t.openTime),
      externalSource: link.platform,
    };

    // فیلدهای دستیِ کاربر (احساسات، چک‌لیست، برچسب، دلایل، عکس، یادداشت)
    // عمداً در آپدیت دست زده نمی‌شوند — کاربر ممکن است روی یک معامله‌ی
    // همگام‌شده تحلیل نوشته باشد و sync بعدی نباید پاکش کند.
    const existing = await prisma.tradeEntry.findUnique({
      where: { accountId_externalId: { accountId: link.accountId, externalId: t.externalId } },
      select: { id: true, riskAmount: true },
    });

    if (existing) {
      await prisma.tradeEntry.update({
        where: { id: existing.id },
        data: { ...data, rMultiple: computeR(data.pnl, existing.riskAmount) },
      });
      updated++;
    } else {
      await prisma.tradeEntry.create({
        data: {
          ...data,
          userId: link.userId,
          accountId: link.accountId,
          externalId: t.externalId,
          rMultiple: null,
        },
      });
      created++;
    }
  }

  const balance = typeof body?.balance === "number" && Number.isFinite(body.balance) ? body.balance : null;
  const equity = typeof body?.equity === "number" && Number.isFinite(body.equity) ? body.equity : null;

  await prisma.tradeMtLink.update({
    where: { id: link.id },
    data: {
      lastSyncAt: new Date(),
      ...(balance !== null ? { balance } : {}),
      ...(equity !== null ? { equity } : {}),
      ...(body?.currency ? { currency: clampText(String(body.currency), 8) } : {}),
    },
  });

  return NextResponse.json({ ok: true, received: trades.length, created, updated });
}
