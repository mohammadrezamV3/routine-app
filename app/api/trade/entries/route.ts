import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";

// عکس روی همین رکورد به‌صورت data URL ذخیره می‌شه (بدون استوریج فایل جدا)؛
// این سقف طول رشته رو محدود می‌کنه — کلاینت از قبل عکس رو فشرده می‌کنه
// (lib/image.ts)، این فقط یک شبکه‌ی ایمنی سمت سرور در برابر پیلود بزرگه.
const MAX_SCREENSHOT_DATA_URL_LEN = 2_500_000;

// GET /api/trade/entries?from=2026-07-01&to=2026-07-31
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    pair, direction, entryPrice, exitPrice, lotSize, pnl, openedAt, closedAt, notes,
    stopLoss, takeProfit, riskPercent, strategy, screenshotUrl,
  } = body as {
    pair: string; direction: "long" | "short"; entryPrice: number; exitPrice?: number;
    lotSize: number; pnl?: number; openedAt: string; closedAt?: string; notes?: string;
    stopLoss?: number; takeProfit?: number; riskPercent?: number; strategy?: string; screenshotUrl?: string;
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
  for (const [label, v] of [["حد ضرر", stopLoss], ["حد سود", takeProfit], ["درصد ریسک", riskPercent]] as const) {
    if (v !== undefined && v !== null && (typeof v !== "number" || isNaN(v) || v < 0)) {
      return NextResponse.json({ error: `${label} نامعتبر است` }, { status: 400 });
    }
  }
  if (screenshotUrl) {
    if (typeof screenshotUrl !== "string" || !screenshotUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "فرمت عکس نامعتبر است" }, { status: 400 });
    }
    if (screenshotUrl.length > MAX_SCREENSHOT_DATA_URL_LEN) {
      return NextResponse.json({ error: "حجم عکس زیاد است" }, { status: 400 });
    }
  }

  const entry = await prisma.tradeEntry.create({
    data: {
      userId, pair: clampText(pair, 20), direction, entryPrice, lotSize,
      exitPrice: exitPrice ?? null,
      pnl: pnl ?? null,
      openedAt: openedAtDate,
      closedAt: closedAt ? new Date(closedAt) : null,
      notes: notes ? clampText(notes, 500) : null,
      stopLoss: stopLoss ?? null,
      takeProfit: takeProfit ?? null,
      riskPercent: riskPercent ?? null,
      strategy: strategy ? clampText(strategy, 40) : null,
      screenshotUrl: screenshotUrl || null,
    },
  });
  return NextResponse.json({ ok: true, entry });
}

// DELETE /api/trade/entries?id=...
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  await prisma.tradeEntry.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
