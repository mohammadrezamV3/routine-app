import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import {
  MtPlatform, PAIRING_TTL_MS, generatePairingCode, hashSecret,
} from "@/lib/metatrader";

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
  return NextResponse.json({ link: serialize(rest, !!tokenHash) });
}

// POST /api/trade/metatrader  { accountId, platform }
// یک کد اتصال تازه می‌سازد. کد فقط همین یک‌بار برگردانده می‌شود؛ در
// دیتابیس فقط هشش می‌ماند، پس اگر کاربر گمش کرد باید کد جدید بگیرد.
export async function POST(req: NextRequest) {
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
export async function DELETE(req: NextRequest) {
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
