import { NextRequest, NextResponse } from "next/server";
import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { clampText } from "@/lib/validate";
import { isHexColor } from "@/lib/tradeServer";

// یادداشت‌های ترید. جست‌وجو عمدا روی عنوان و متن با `contains` انجام
// می‌شود (نه full-text index): حجم یادداشت‌های یک کاربر کوچک است و
// ایندکس متنی برای این اندازه پیچیدگی بی‌فایده‌ای است.

const MAX_NOTES = 300;

const NOTE_SELECT = {
  id: true, title: true, content: true, color: true, pinned: true,
  accountId: true, entryId: true, createdAt: true, updatedAt: true,
  tags: { select: { id: true, name: true, color: true } },
} as const;

function serialize(n: Prisma.TradeNoteGetPayload<{ select: typeof NOTE_SELECT }>) {
  return { ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() };
}

async function ownedTagIds(userId: string, raw: unknown): Promise<{ id: string }[]> {
  const ids = Array.isArray(raw) ? raw.filter((t: unknown) => typeof t === "string").slice(0, 20) : [];
  if (!ids.length) return [];
  return prisma.tradeTag.findMany({ where: { id: { in: ids }, userId }, select: { id: true } });
}

function parseNote(body: any): string | { title: string; content: string; color: string; pinned: boolean } {
  if (!body || typeof body !== "object") return "بدنه‌ی درخواست نامعتبر است";
  const title = String(body.title || "").trim();
  if (!title) return "عنوان یادداشت الزامی است";
  return {
    title: clampText(title, 120),
    content: clampText(String(body.content || ""), 20_000),
    color: isHexColor(body.color) ? body.color : "#3E7BFA",
    pinned: !!body.pinned,
  };
}

// GET /api/trade/notes?q=...&tags=id1,id2&accountId=...
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const params = req.nextUrl.searchParams;
  const q = (params.get("q") || "").trim().slice(0, 100);
  const tagIds = (params.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  const accountId = params.get("accountId") || undefined;

  const where: Prisma.TradeNoteWhereInput = { userId };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }
  if (tagIds.length) where.tags = { some: { id: { in: tagIds } } };
  if (accountId) where.accountId = accountId;

  const notes = await prisma.tradeNote.findMany({
    where,
    // سنجاق‌شده‌ها همیشه بالا، بعد تازه‌ترین ویرایش
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 300,
    select: NOTE_SELECT,
  });
  return NextResponse.json({ notes: notes.map(serialize) });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const parsed = parseNote(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const count = await prisma.tradeNote.count({ where: { userId } });
  if (count >= MAX_NOTES) return NextResponse.json({ error: `حداکثر ${MAX_NOTES} یادداشت مجاز است` }, { status: 400 });

  // ارجاع‌های اختیاری فقط وقتی ثبت می‌شوند که واقعا مال همین کاربر باشند
  const accountId = body?.accountId
    ? (await prisma.tradeAccount.findFirst({ where: { id: String(body.accountId), userId }, select: { id: true } }))?.id ?? null
    : null;
  const entryId = body?.entryId
    ? (await prisma.tradeEntry.findFirst({ where: { id: String(body.entryId), userId }, select: { id: true } }))?.id ?? null
    : null;

  const note = await prisma.tradeNote.create({
    data: {
      ...parsed, userId, accountId, entryId,
      tags: { connect: (await ownedTagIds(userId, body?.tagIds)).map((t) => ({ id: t.id })) },
    },
    select: NOTE_SELECT,
  });
  return NextResponse.json({ ok: true, note: serialize(note) });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  const parsed = parseNote(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const existing = await prisma.tradeNote.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "یادداشت پیدا نشد" }, { status: 404 });

  const note = await prisma.tradeNote.update({
    where: { id },
    data: {
      ...parsed,
      tags: { set: (await ownedTagIds(userId, body?.tagIds)).map((t) => ({ id: t.id })) },
    },
    select: NOTE_SELECT,
  });
  return NextResponse.json({ ok: true, note: serialize(note) });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });
  await prisma.tradeNote.deleteMany({ where: { id, userId: guard.userId } });
  return NextResponse.json({ ok: true });
}
