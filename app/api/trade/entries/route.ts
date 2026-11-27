import { NextRequest, NextResponse } from "next/server";
import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { parseTradeInput, ENTRY_SELECT, serializeEntry } from "@/lib/tradeServer";
import { ownedAccount, buildChecklistSnapshot, createTradeEntryFromBody } from "@/lib/tradeCreate";
import { parseDateRange } from "@/lib/validate";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { tr } from "@/lib/i18n";
import { withIdempotency } from "@/lib/idempotency";

// معاملات یک حساب. برخلاف نسخه‌ی قبلی که همه‌ی معاملات کاربر را یکجا
// می‌داد، این‌جا accountId اجباری است — چون کل UI حساب‌محور است و آمار دو
// حساب متفاوت هیچ‌وقت نباید با هم جمع شود.

// GET /api/trade/entries?accountId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const accountId = req.nextUrl.searchParams.get("accountId") || "";
  const fromRaw = req.nextUrl.searchParams.get("from");
  const toRaw = req.nextUrl.searchParams.get("to");
  let dateFilter: Prisma.TradeEntryWhereInput = {};
  if (fromRaw || toRaw) {
    const range = parseDateRange(fromRaw, toRaw);
    if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });
    // openedAt یک timestamp است نه فقط روز، پس تا آخر روز پایانی باز می‌شود
    dateFilter = { openedAt: { gte: range.from, lte: new Date(range.to.getTime() + 86_400_000 - 1) } };
  }

  // مالکیت حساب و خواندن معاملات مستقل‌اند (خود کوئری معاملات هم با userId
  // محدوده) → هم‌زمان؛ حساب غیرمال کاربر همچنان ۴۰۴ می‌گیره.
  const [owned, entries] = await Promise.all([
    ownedAccount(userId, accountId),
    prisma.tradeEntry.findMany({
      where: { userId, accountId, ...dateFilter },
      orderBy: { openedAt: "desc" },
      take: 2000,
      select: ENTRY_SELECT,
    }),
  ]);
  if (!owned) return NextResponse.json({ error: tr(tr("حساب پیدا نشد", "Account not found"), "Account not found") }, { status: 404 });

  return NextResponse.json({ entries: entries.map(serializeEntry) });
}

// POST /api/trade/entries
async function handlePOST(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  return withIdempotency(req, userId, "trade.entries", async () => {
  const body = await req.json().catch(() => null);
  const created = await createTradeEntryFromBody(userId, body);
  if ("error" in created) return NextResponse.json({ error: created.error }, { status: created.status });
  return NextResponse.json({ ok: true, entry: created.entry });
  });
}

// PATCH /api/trade/entries  { id, ...همه‌ی فیلدها }
// فرم همیشه کل رکورد را می‌فرستد، پس این جایگزینی کامل است نه patch جزئی.
async function handlePATCH(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: tr(tr("id الزامی است", "id is required"), "id is required") }, { status: 400 });

  const parsed = parseTradeInput(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const existing = await prisma.tradeEntry.findFirst({ where: { id, userId }, select: { id: true, externalId: true } });
  if (!existing) return NextResponse.json({ error: tr(tr("معامله پیدا نشد", "Trade not found"), "Trade not found") }, { status: 404 });
  if (!(await ownedAccount(userId, parsed.data.accountId))) {
    return NextResponse.json({ error: tr(tr("حساب پیدا نشد", "Account not found"), "Account not found") }, { status: 404 });
  }

  // معامله‌ای که از متاتریدر آمده (externalId دارد) و کاربر الان دستی ویرایشش
  // می‌کند — از این به بعد sync دیگر رویش را بازنویسی نکند.
  const syncLock = existing.externalId ? { syncLocked: true } : {};

  const checklist = await buildChecklistSnapshot(userId, body?.checklistId ?? null, parsed.checklistState);
  const ownedTags = parsed.tagIds.length
    ? await prisma.tradeTag.findMany({ where: { id: { in: parsed.tagIds }, userId }, select: { id: true } })
    : [];

  // عکس‌ها یکجا جایگزین می‌شوند (نه تفاضلی) — فرم همیشه لیست نهایی را
  // می‌فرستد و تشخیص «کدام عکس همان عکس قبلی است» روی data URL شکننده است.
  const [, entry] = await prisma.$transaction([
    prisma.tradeImage.deleteMany({ where: { entryId: id } }),
    prisma.tradeEntry.update({
      where: { id },
      data: {
        ...parsed.data,
        ...checklist,
        ...syncLock,
        tags: { set: ownedTags.map((t) => ({ id: t.id })) },
        images: { create: parsed.images.map((img, i) => ({ dataUrl: img.dataUrl, caption: img.caption, order: i })) },
      },
      select: ENTRY_SELECT,
    }),
  ]);

  return NextResponse.json({ ok: true, entry: serializeEntry(entry) });
}

// DELETE /api/trade/entries?id=...
async function handleDELETE(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: tr(tr("id الزامی است", "id is required"), "id is required") }, { status: 400 });
  await prisma.tradeEntry.deleteMany({ where: { id, userId: guard.userId } });
  return NextResponse.json({ ok: true });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["trade"], handlePOST);
export const PATCH = withLiveSync(["trade"], handlePATCH);
export const DELETE = withLiveSync(["trade"], handleDELETE);
