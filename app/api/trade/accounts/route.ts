import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { parseAccountInput } from "@/lib/tradeServer";
import { computeTradeStats } from "@/lib/tradeAnalytics";
import { MAX_ACCOUNTS } from "@/lib/tradeTypes";

// حساب‌های معاملاتی کاربر. ورودی صفحه‌ی «ژورنال‌نویسی» همین است: اول
// حساب‌ها، بعد با انتخاب حساب می‌رویم داخل آمار و معاملاتش.

const ACCOUNT_SELECT = {
  id: true, name: true, broker: true, type: true, currency: true,
  initialBalance: true, leverage: true, color: true, note: true,
  goalType: true, goalValue: true, archived: true, order: true,
  tags: { select: { id: true, name: true, color: true } },
  // وضعیت اتصال متاتریدر همین‌جا می‌آید تا صفحه‌ی «اتصال متاتریدر» مجبور
  // نباشد به‌ازای هر حساب یک درخواست جدا بزند (با ۱۰ حساب می‌شد ۱۱ درخواست
  // سریالی — همان چیزی که باز شدن صفحه را کند نشان می‌داد).
  mtLink: { select: { tokenHash: true, revokedAt: true, lastSyncAt: true, platform: true } },
} as const;

// GET /api/trade/accounts?archived=1
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const includeArchived = req.nextUrl.searchParams.get("archived") === "1";

  const accounts = await prisma.tradeAccount.findMany({
    where: { userId, ...(includeArchived ? {} : { archived: false }) },
    orderBy: [{ archived: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    select: ACCOUNT_SELECT,
  });

  // خلاصه‌ی هر کارت در یک کوئری برای همه‌ی حساب‌ها، نه یکی به‌ازای هر حساب
  // (کاربر می‌تواند ده حساب داشته باشد؛ ده کوئری برای یک صفحه زیاد است).
  // فقط ستون‌های موردنیاز آمار انتخاب می‌شوند تا متن/عکس کشیده نشود.
  const stats = await prisma.tradeEntry.findMany({
    where: { userId, accountId: { in: accounts.map((a) => a.id) } },
    select: { accountId: true, status: true, pnl: true, rMultiple: true, openedAt: true },
    take: 20_000,
  });

  const byAccount = new Map<string, typeof stats>();
  for (const s of stats) {
    if (!byAccount.has(s.accountId)) byAccount.set(s.accountId, []);
    byAccount.get(s.accountId)!.push(s);
  }

  const withSummary = accounts.map((account) => {
    const { mtLink, ...a } = account;
    const list = (byAccount.get(a.id) || []).map((e) => ({
      status: e.status, pnl: e.pnl, rMultiple: e.rMultiple, openedAt: e.openedAt.toISOString(),
    }));
    const s = computeTradeStats(list, a);
    return {
      ...a,
      // هش توکن عمدا بیرون داده نمی‌شود — فقط «متصل هست یا نه»
      mtConnected: !!mtLink?.tokenHash && !mtLink.revokedAt,
      mtLastSyncAt: mtLink?.lastSyncAt ? mtLink.lastSyncAt.toISOString() : null,
      summary: {
        tradeCount: s.total,
        closedCount: s.closedCount,
        netPnl: s.netPnl,
        balance: s.balance,
        winRate: s.winRate,
        goalProgress: s.goalProgress,
      },
    };
  });

  return NextResponse.json({ accounts: withSummary });
}

// POST /api/trade/accounts
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const parsed = parseAccountInput(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const active = await prisma.tradeAccount.count({ where: { userId, archived: false } });
  if (active >= MAX_ACCOUNTS) {
    return NextResponse.json({ error: `حداکثر ${MAX_ACCOUNTS} حساب فعال می‌توانی داشته باشی` }, { status: 400 });
  }

  const tagIds: string[] = Array.isArray(body?.tagIds) ? body.tagIds.filter((t: unknown) => typeof t === "string") : [];
  const ownedTags = tagIds.length
    ? await prisma.tradeTag.findMany({ where: { id: { in: tagIds }, userId }, select: { id: true } })
    : [];

  const created = await prisma.tradeAccount.create({
    data: {
      ...parsed,
      userId,
      order: active,
      tags: { connect: ownedTags.map((t) => ({ id: t.id })) },
    },
    select: ACCOUNT_SELECT,
  });
  const { mtLink: _created, ...account } = created;
  return NextResponse.json({ ok: true, account });
}

// PATCH /api/trade/accounts  { id, ...fields }
export async function PATCH(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  const parsed = parseAccountInput(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  // مالکیت صریح چک می‌شود (نه فقط id) — جلوگیری از IDOR، هم‌قاعده‌ی بقیه‌ی روت‌ها
  const existing = await prisma.tradeAccount.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });

  const tagIds: string[] = Array.isArray(body?.tagIds) ? body.tagIds.filter((t: unknown) => typeof t === "string") : [];
  const ownedTags = tagIds.length
    ? await prisma.tradeTag.findMany({ where: { id: { in: tagIds }, userId }, select: { id: true } })
    : [];

  const updated = await prisma.tradeAccount.update({
    where: { id },
    data: { ...parsed, tags: { set: ownedTags.map((t) => ({ id: t.id })) } },
    select: ACCOUNT_SELECT,
  });
  const { mtLink: _updated, ...account } = updated;
  return NextResponse.json({ ok: true, account });
}

// DELETE /api/trade/accounts?id=...&mode=archive|purge
//
// پیش‌فرض «آرشیو» است، نه حذف: تاریخچه‌ی معاملات ارزشمندترین دارایی این
// ماژول است و پاک‌کردنش با یک کلیک برگشت‌ناپذیر خواهد بود. حذف کامل فقط
// وقتی انجام می‌شود که کلاینت صریحا mode=purge بفرستد (پشت تأیید تایپی).
export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const id = req.nextUrl.searchParams.get("id");
  const mode = req.nextUrl.searchParams.get("mode") === "purge" ? "purge" : "archive";
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  const existing = await prisma.tradeAccount.findFirst({ where: { id, userId }, select: { id: true, archived: true } });
  if (!existing) return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });

  if (mode === "purge") {
    // معاملات و عکس‌هایشان با cascade می‌روند
    await prisma.tradeAccount.deleteMany({ where: { id, userId } });
    return NextResponse.json({ ok: true, purged: true });
  }

  const archived = !existing.archived;
  await prisma.tradeAccount.updateMany({
    where: { id, userId },
    data: { archived, archivedAt: archived ? new Date() : null },
  });
  return NextResponse.json({ ok: true, archived });
}
