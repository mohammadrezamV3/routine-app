import { NextRequest, NextResponse } from "next/server";
import { Prisma, ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { withLiveSync } from "@/lib/realtime";
import { DEFAULT_MONEY_RULES, normalizeMmEvents, readStoredRules, validateMoneyRules } from "@/lib/moneyMgmt";
import { EA_LATEST_VERSION, isEaOutdated } from "@/lib/mtShotDiag";

// قوانین مدیریت سرمایه‌ی یک حساب (روی TradeMtLink) که اکسپرت در sync می‌گیره و
// اجرا می‌کنه. آزمایشی: پشت فلگ «tradeMoneyMgmt» (فقط ادمین‌ها تا انتشار).

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

type Ctx = { params: { id: string } };

async function gate() {
  { const off = await sessionFeatureBlocked("tradeMoneyMgmt"); if (off) return { ok: false as const, response: off }; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return { ok: false as const, response: guard.response };
  return { ok: true as const, userId: guard.userId };
}

async function owned(userId: string, id: string) {
  if (!id || id.length > 64) return null;
  return prisma.tradeAccount.findFirst({ where: { id, userId }, select: { id: true } });
}

async function handleGET(_req: Request, { params }: Ctx) {
  const g = await gate();
  if (!g.ok) return g.response;
  const acc = await owned(g.userId, params.id);
  if (!acc) return json({ error: "حساب پیدا نشد" }, 404);

  const link = await prisma.tradeMtLink.findUnique({
    where: { accountId: acc.id },
    select: { moneyRules: true, mmLog: true, eaVersion: true, tokenHash: true, revokedAt: true, lastSyncAt: true, platform: true },
  });
  return json({
    rules: link?.moneyRules ? readStoredRules(link.moneyRules) : DEFAULT_MONEY_RULES,
    log: normalizeMmEvents(Array.isArray(link?.mmLog) ? link!.mmLog : []).slice(-30),
    connected: !!link && !!link.tokenHash && !link.revokedAt,
    eaVersion: link?.eaVersion ?? null,
    eaLatest: EA_LATEST_VERSION,
    eaOutdated: link?.eaVersion ? isEaOutdated(link.eaVersion) : !!link && !!link.tokenHash,
    platform: link?.platform ?? null,
    lastSyncAt: link?.lastSyncAt?.toISOString() ?? null,
  });
}

async function handlePUT(req: Request, { params }: Ctx) {
  const g = await gate();
  if (!g.ok) return g.response;
  const acc = await owned(g.userId, params.id);
  if (!acc) return json({ error: "حساب پیدا نشد" }, 404);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "ورودی نامعتبر است" }, 400);
  const rules = validateMoneyRules((body as { rules?: unknown }).rules ?? body);

  // قوانین روی اتصال متاتریدر همین حساب می‌شینن؛ بدون اتصال جایی برای ذخیره نیست
  const link = await prisma.tradeMtLink.findUnique({ where: { accountId: acc.id }, select: { id: true } });
  if (!link) return json({ error: "اول متاتریدر را به این حساب وصل کنید" }, 409);
  await prisma.tradeMtLink.update({
    where: { id: link.id },
    data: { moneyRules: rules as unknown as Prisma.InputJsonValue },
  });
  return json({ ok: true, rules });
}

export const GET = handleGET as (req: NextRequest, ctx: Ctx) => Promise<Response>;
export const PUT = withLiveSync(["trade"], handlePUT as (req: NextRequest, ctx: Ctx) => Promise<Response>);
