import { NextRequest, NextResponse } from "next/server";
import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { withLiveSync } from "@/lib/realtime";
import { loadAccountMoney } from "@/lib/tradeCashflowServer";
import {
  advancePhase, initialPropState, parsePropConfig, restartPhase, readStoredConfig,
} from "@/lib/propChallenge";
import { evaluateAndSync, loadAccountTrades, propInitialSize, toState } from "@/lib/propChallengeServer";
import { tr } from "@/lib/i18n";

// چالش حساب پراپ. GET: پیکربندی + وضعیت + پیشرفت محاسبه‌شده؛ PUT: ذخیره‌ی
// پیکربندی؛ POST {action: advance|restart}؛ DELETE: برداشتن چالش (معامله‌ها دست‌نخورده).

type Ctx = { params: { id: string } };

async function ownedProp(userId: string, id: string) {
  const account = await prisma.tradeAccount.findFirst({ where: { id, userId }, select: { id: true, type: true, initialBalance: true } });
  if (!account) return { ok: false as const, res: NextResponse.json({ error: tr("حساب پیدا نشد", "Account not found") }, { status: 404 }) };
  if (account.type !== "PROP") return { ok: false as const, res: NextResponse.json({ error: tr("چالش فقط برای حساب پراپ است", "Challenges are only for prop accounts") }, { status: 400 }) };
  const money = (await loadAccountMoney([account])).get(account.id)!;
  return { ok: true as const, account, initialSize: propInitialSize(money) };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  { const off = await sessionFeatureBlocked("trade"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const owned = await ownedProp(guard.userId, params.id);
  if (!owned.ok) return owned.res;

  const rec = await prisma.tradePropChallenge.findFirst({ where: { accountId: params.id, userId: guard.userId } });
  if (!rec) return NextResponse.json({ challenge: null });
  const { view } = await evaluateAndSync(rec, await loadAccountTrades(guard.userId, params.id), owned.initialSize);
  return NextResponse.json({ challenge: view, initialSize: owned.initialSize });
}

async function handlePUT(req: NextRequest, { params }: Ctx) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const owned = await ownedProp(guard.userId, params.id);
  if (!owned.ok) return owned.res;

  const body = await req.json().catch(() => null);
  const config = parsePropConfig(body);
  if (typeof config === "string") return NextResponse.json({ error: config }, { status: 400 });
  const json = config as unknown as Prisma.InputJsonValue;

  // شروع فاز اول = اولین معامله‌ی حساب (حساب پراپ معمولا اختصاصی چالشه)؛ بدون معامله = همین الان.
  // اگه بخشی از معامله‌ها قبل از چالش بوده، با «شروع دوباره» از لحظه‌ی دلخواه شروع می‌شه.
  const firstTrade = await prisma.tradeEntry.findFirst({ where: { accountId: params.id, userId: guard.userId }, orderBy: { openedAt: "asc" }, select: { openedAt: true } });
  const startAt = firstTrade && firstTrade.openedAt.getTime() < Date.now() ? firstTrade.openedAt : new Date();

  const existing = await prisma.tradePropChallenge.findFirst({ where: { accountId: params.id, userId: guard.userId } });
  if (!existing) {
    const s = initialPropState(config, new Date());
    await prisma.tradePropChallenge.create({
      data: { userId: guard.userId, accountId: params.id, config: json, currentPhase: s.currentPhase, status: s.status, phaseStartedAt: startAt },
    });
  } else if (readStoredConfig(existing.config).phases.length !== config.phases.length) {
    // تعداد فازها عوض شد → چالش از اول (تاریخچه می‌مونه، معامله‌ها دست نمی‌خورن)
    const s = initialPropState(config, new Date());
    await prisma.tradePropChallenge.updateMany({
      where: { id: existing.id, userId: guard.userId },
      data: { config: json, currentPhase: s.currentPhase, status: s.status, phaseStartedAt: startAt, phaseEndedAt: null, phaseStartBalance: null },
    });
  } else {
    await prisma.tradePropChallenge.updateMany({ where: { id: existing.id, userId: guard.userId }, data: { config: json } });
  }
  const rec = await prisma.tradePropChallenge.findFirstOrThrow({ where: { accountId: params.id, userId: guard.userId } });
  const { view } = await evaluateAndSync(rec, await loadAccountTrades(guard.userId, params.id), owned.initialSize);
  return NextResponse.json({ ok: true, challenge: view });
}

async function handlePOST(req: NextRequest, { params }: Ctx) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const owned = await ownedProp(guard.userId, params.id);
  if (!owned.ok) return owned.res;

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "advance" && action !== "restart") return NextResponse.json({ error: tr("عملیات نامعتبر است", "Invalid action") }, { status: 400 });

  const rec0 = await prisma.tradePropChallenge.findFirst({ where: { accountId: params.id, userId: guard.userId } });
  if (!rec0) return NextResponse.json({ error: tr("برای این حساب چالشی تنظیم نشده", "No challenge is set for this account") }, { status: 404 });
  // اول وضعیت تازه‌ی محاسبه‌شده رو ثبت کن (ممکنه همین الان قبول/شکست شده باشه)
  const { rec } = await evaluateAndSync(rec0, await loadAccountTrades(guard.userId, params.id), owned.initialSize);

  const config = readStoredConfig(rec.config);
  const next = (action === "advance" ? advancePhase : restartPhase)(config, toState(rec), new Date(), owned.initialSize);
  if (!next) {
    return NextResponse.json({
      error: action === "advance"
        ? tr("فاز هنوز قبول نشده", "The phase has not been passed yet")
        : tr("فاز شکست نخورده", "The phase has not failed"),
    }, { status: 409 });
  }
  // شرط status: دو کلیک هم‌زمان فقط یک بار اعمال می‌شه
  const res = await prisma.tradePropChallenge.updateMany({
    where: { id: rec.id, userId: guard.userId, status: rec.status },
    data: {
      currentPhase: next.currentPhase, status: next.status, phaseStartedAt: next.phaseStartedAt as Date,
      phaseEndedAt: null, phaseStartBalance: next.phaseStartBalance,
    },
  });
  if (!res.count) return NextResponse.json({ error: tr("وضعیت چالش تغییر کرده؛ صفحه را تازه کن", "The challenge changed; refresh the page") }, { status: 409 });
  const fresh = await prisma.tradePropChallenge.findFirstOrThrow({ where: { id: rec.id } });
  const { view } = await evaluateAndSync(fresh, await loadAccountTrades(guard.userId, params.id), owned.initialSize);
  return NextResponse.json({ ok: true, challenge: view });
}

async function handleDELETE(_req: NextRequest, { params }: Ctx) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const owned = await ownedProp(guard.userId, params.id);
  if (!owned.ok) return owned.res;
  await prisma.tradePropChallenge.deleteMany({ where: { accountId: params.id, userId: guard.userId } });
  return NextResponse.json({ ok: true });
}

export const PUT = withLiveSync(["trade"], handlePUT);
export const POST = withLiveSync(["trade"], handlePOST);
export const DELETE = withLiveSync(["trade"], handleDELETE);
