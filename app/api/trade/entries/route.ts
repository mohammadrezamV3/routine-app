import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { clampText } from "@/lib/validate";

// GET /api/trade/entries?from=2026-07-01&to=2026-07-31
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from/to الزامی است" }, { status: 400 });

  const entries = await prisma.tradeEntry.findMany({
    where: { userId, openedAt: { gte: new Date(from), lte: new Date(to) } },
    orderBy: { openedAt: "asc" },
  });
  return NextResponse.json({ entries });
}

// POST /api/trade/entries  { pair, direction, entryPrice, exitPrice, lotSize, pnl, openedAt, closedAt, notes }
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const { pair, direction, entryPrice, exitPrice, lotSize, pnl, openedAt, closedAt, notes } = body as {
    pair: string; direction: "long" | "short"; entryPrice: number; exitPrice?: number;
    lotSize: number; pnl?: number; openedAt: string; closedAt?: string; notes?: string;
  };

  if (!pair || !direction || !entryPrice || !lotSize || !openedAt) {
    return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
  }
  if (direction !== "long" && direction !== "short") {
    return NextResponse.json({ error: "جهت معامله نامعتبر است" }, { status: 400 });
  }
  if (typeof entryPrice !== "number" || typeof lotSize !== "number" || entryPrice <= 0 || lotSize <= 0) {
    return NextResponse.json({ error: "قیمت/لات باید عدد مثبت باشد" }, { status: 400 });
  }
  const openedAtDate = new Date(openedAt);
  if (isNaN(openedAtDate.getTime())) {
    return NextResponse.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
  }

  const entry = await prisma.tradeEntry.create({
    data: {
      userId, pair: clampText(pair, 20), direction, entryPrice, lotSize,
      exitPrice: exitPrice ?? null,
      pnl: pnl ?? null,
      openedAt: openedAtDate,
      closedAt: closedAt ? new Date(closedAt) : null,
      notes: notes ? clampText(notes, 500) : null,
    },
  });
  return NextResponse.json({ ok: true, entry });
}

// DELETE /api/trade/entries?id=...
export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  await prisma.tradeEntry.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
