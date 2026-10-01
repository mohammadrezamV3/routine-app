import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import {
  MtPlatform, PAIRING_TTL_MS, generatePairingCode, hashSecret, summarizeCashflows,
} from "@/lib/metatrader";
import { withLiveSync } from "@/lib/realtime";

// مدیریت اتصال متاتریدر یک حساب، از سمت کاربر لاگین‌کرده.
// (اندپوینت‌هایی که خود EA صدا می‌زند جدا هستند: /api/mt/pair و /api/mt/sync)

const LINK_SELECT = {
  id: true, platform: true, brokerName: true, serverName: true, accountLogin: true,
  balance: true, equity: true, currency: true, tokenPrefix: true,
  connectedAt: true, lastSyncAt: true, revokedAt: true, pairingExpiresAt: true,
} as const;

function serialize(l: any, hasToken: boolean) {
  return {
    ...l,
    connected: hasToken && !l.revokedAt,
    connectedAt: l.connectedAt?.toISOString() ?? null,
    lastSyncAt: l.lastSyncAt?.toISOString() ?? null,
    revokedAt: l.revokedAt?.toISOString() ?? null,
    pairingExpiresAt: l.pairingExpiresAt?.toISOString() ?? null,
  };
}

async function ownedAccount(userId: string, accountId: string) {
  if (!accountId) return null;
  return prisma.tradeAccount.findFirst({ where: { id: accountId, userId }, select: { id: true } });
}

// GET /api/trade/metatrader?accountId=...
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const accountId = req.nextUrl.searchParams.get("accountId") || "";
  if (!(await ownedAccount(guard.userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }

  const link = await prisma.tradeMtLink.findUnique({
    where: { accountId },
    select: { ...LINK_SELECT, tokenHash: true },
  });
  if (!link) return NextResponse.json({ link: null });

  const { tokenHash, ...rest } = link;

  // تطبیق موجودی: موجودی‌ای که ژورنال از روی داده‌های همگام‌شده می‌سازه (موجودی
  // اولیه + واریز/برداشت + هزینه‌های غیرمعاملاتی + سود خالص معاملات بسته) در
  // برابر موجودی واقعی که خود EA گزارش داده. اختلاف یعنی تاریخچه کامل نرسیده
  // (مثلا MT4 با تب Account History غیر از «All History») یا EA قدیمیه.
  const [acc, pnlAgg, cashRows] = await Promise.all([
    prisma.tradeAccount.findUnique({ where: { id: accountId }, select: { initialBalance: true } }),
    prisma.tradeEntry.aggregate({ where: { accountId, status: "CLOSED" }, _sum: { pnl: true } }),
    prisma.tradeCashflow.groupBy({ by: ["kind"], where: { accountId }, _sum: { amount: true } }),
  ]);
  const cf = summarizeCashflows(cashRows.map((c) => ({ kind: c.kind, amount: c._sum.amount ?? 0 })));
  const tradesPnl = Math.round((pnlAgg._sum.pnl ?? 0) * 100) / 100;
  const journalBalance = Math.round(((acc?.initialBalance ?? 0) + cf.funding + cf.charges + tradesPnl) * 100) / 100;
  const mtBalance = typeof link.balance === "number" ? link.balance : null;
  const reconciliation = {
    journalBalance,
    mtBalance,
    difference: mtBalance === null ? null : Math.round((mtBalance - journalBalance) * 100) / 100,
    tradesPnl,
    funding: cf.funding,
    charges: cf.charges,
    initialBalance: acc?.initialBalance ?? 0,
  };
  return NextResponse.json({ link: serialize(rest, !!tokenHash), reconciliation });
}

// POST /api/trade/metatrader  { accountId, platform }
// یک کد اتصال تازه می‌سازد. کد فقط همین یک‌بار برگردانده می‌شود؛ در
// دیتابیس فقط هشش می‌ماند، پس اگر کاربر گمش کرد باید کد جدید بگیرد.
async function handlePOST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const accountId = String(body?.accountId || "");
  const platform: MtPlatform = body?.platform === "MT5" ? "MT5" : "MT4";
  if (!(await ownedAccount(userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }

  const code = generatePairingCode();
  const pairingHash = hashSecret(code);
  const pairingExpiresAt = new Date(Date.now() + PAIRING_TTL_MS);

  const link = await prisma.tradeMtLink.upsert({
    where: { accountId },
    create: { userId, accountId, platform, pairingHash, pairingExpiresAt },
    // کد جدید، اتصال قبلی را باطل می‌کند — وگرنه یک EAی قدیمی روی همان
    // حساب می‌ماند بدون اینکه کاربر بداند.
    update: { platform, pairingHash, pairingExpiresAt, tokenHash: null, tokenPrefix: null, revokedAt: null, connectedAt: null },
    select: LINK_SELECT,
  });

  return NextResponse.json({ ok: true, code, expiresAt: pairingExpiresAt.toISOString(), link: serialize(link, false) });
}

// DELETE /api/trade/metatrader?accountId=... — ابطال اتصال
// معاملات همگام‌شده دست‌نخورده می‌مانند؛ فقط EA دیگر اجازه‌ی ارسال ندارد.
async function handleDELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const accountId = req.nextUrl.searchParams.get("accountId") || "";
  if (!(await ownedAccount(guard.userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }

  await prisma.tradeMtLink.updateMany({
    where: { accountId, userId: guard.userId },
    data: { tokenHash: null, tokenPrefix: null, pairingHash: null, pairingExpiresAt: null, revokedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["trade"], handlePOST);
export const DELETE = withLiveSync(["trade"], handleDELETE);
