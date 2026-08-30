import { NextRequest, NextResponse } from "next/server";
import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { parseTradeInput, ENTRY_SELECT, serializeEntry } from "@/lib/tradeServer";
import { parseDateRange } from "@/lib/validate";

// معاملاتِ یک حساب. برخلافِ نسخه‌ی قبلی که همه‌ی معاملاتِ کاربر را یکجا
// می‌داد، این‌جا accountId اجباری است — چون کلِ UI حساب‌محور است و آمارِ دو
// حسابِ متفاوت هیچ‌وقت نباید با هم جمع شود.

/** حسابی که به کاربر تعلق دارد — هر روتِ معامله اول از این رد می‌شود */
async function ownedAccount(userId: string, accountId: string) {
  if (!accountId) return null;
  return prisma.tradeAccount.findFirst({ where: { id: accountId, userId }, select: { id: true } });
}

/**
 * اسنپ‌شاتِ چک‌لیست در لحظه‌ی ثبت.
 * متنِ آیتم‌ها کپی می‌شود نه ارجاع داده — اگر کاربر فردا یک آیتم را عوض یا
 * حذف کند، آمارِ معاملاتِ دیروز نباید بی‌صدا معنی دیگری پیدا کند.
 */
async function buildChecklistSnapshot(userId: string, checklistId: string | null, state: Record<string, boolean>) {
  if (!checklistId) {
    return { checklistId: null, checklistName: null, checklistDone: null, checklistTotal: null, checklistSnapshot: Prisma.DbNull };
  }
  const checklist = await prisma.tradeChecklist.findFirst({
    where: { id: checklistId, userId },
    select: { id: true, name: true, items: { select: { id: true, text: true }, orderBy: { order: "asc" } } },
  });
  if (!checklist) {
    return { checklistId: null, checklistName: null, checklistDone: null, checklistTotal: null, checklistSnapshot: Prisma.DbNull };
  }
  const snapshot = checklist.items.map((i) => ({ text: i.text, checked: !!state[i.id] }));
  return {
    checklistId: checklist.id,
    checklistName: checklist.name,
    checklistDone: snapshot.filter((i) => i.checked).length,
    checklistTotal: snapshot.length,
    checklistSnapshot: snapshot as unknown as Prisma.InputJsonValue,
  };
}

// GET /api/trade/entries?accountId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const accountId = req.nextUrl.searchParams.get("accountId") || "";
  if (!(await ownedAccount(userId, accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }

  const fromRaw = req.nextUrl.searchParams.get("from");
  const toRaw = req.nextUrl.searchParams.get("to");
  let dateFilter: Prisma.TradeEntryWhereInput = {};
  if (fromRaw || toRaw) {
    const range = parseDateRange(fromRaw, toRaw);
    if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });
    // openedAt یک timestamp است نه فقط روز، پس تا آخرِ روزِ پایانی باز می‌شود
    dateFilter = { openedAt: { gte: range.from, lte: new Date(range.to.getTime() + 86_400_000 - 1) } };
  }

  const entries = await prisma.tradeEntry.findMany({
    where: { userId, accountId, ...dateFilter },
    orderBy: { openedAt: "desc" },
    take: 2000,
    select: ENTRY_SELECT,
  });

  return NextResponse.json({ entries: entries.map(serializeEntry) });
}

// POST /api/trade/entries
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const parsed = parseTradeInput(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  if (!(await ownedAccount(userId, parsed.data.accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }

  const checklist = await buildChecklistSnapshot(userId, body?.checklistId ?? null, parsed.checklistState);
  const ownedTags = parsed.tagIds.length
    ? await prisma.tradeTag.findMany({ where: { id: { in: parsed.tagIds }, userId }, select: { id: true } })
    : [];

  const entry = await prisma.tradeEntry.create({
    data: {
      ...parsed.data,
      ...checklist,
      userId,
      tags: { connect: ownedTags.map((t) => ({ id: t.id })) },
      images: { create: parsed.images.map((img, i) => ({ dataUrl: img.dataUrl, caption: img.caption, order: i })) },
    },
    select: ENTRY_SELECT,
  });

  return NextResponse.json({ ok: true, entry: serializeEntry(entry) });
}

// PATCH /api/trade/entries  { id, ...همه‌ی فیلدها }
// فرم همیشه کلِ رکورد را می‌فرستد، پس این جایگزینیِ کامل است نه patchِ جزئی.
export async function PATCH(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  const parsed = parseTradeInput(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const existing = await prisma.tradeEntry.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "معامله پیدا نشد" }, { status: 404 });
  if (!(await ownedAccount(userId, parsed.data.accountId))) {
    return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  }

  const checklist = await buildChecklistSnapshot(userId, body?.checklistId ?? null, parsed.checklistState);
  const ownedTags = parsed.tagIds.length
    ? await prisma.tradeTag.findMany({ where: { id: { in: parsed.tagIds }, userId }, select: { id: true } })
    : [];

  // عکس‌ها یکجا جایگزین می‌شوند (نه تفاضلی) — فرم همیشه لیستِ نهایی را
  // می‌فرستد و تشخیصِ «کدام عکس همان عکسِ قبلی است» روی data URL شکننده است.
  const [, entry] = await prisma.$transaction([
    prisma.tradeImage.deleteMany({ where: { entryId: id } }),
    prisma.tradeEntry.update({
      where: { id },
      data: {
        ...parsed.data,
        ...checklist,
        tags: { set: ownedTags.map((t) => ({ id: t.id })) },
        images: { create: parsed.images.map((img, i) => ({ dataUrl: img.dataUrl, caption: img.caption, order: i })) },
      },
      select: ENTRY_SELECT,
    }),
  ]);

  return NextResponse.json({ ok: true, entry: serializeEntry(entry) });
}

// DELETE /api/trade/entries?id=...
export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });
  await prisma.tradeEntry.deleteMany({ where: { id, userId: guard.userId } });
  return NextResponse.json({ ok: true });
}
