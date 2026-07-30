import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { ModuleKey } from "@prisma/client";
import { clampText } from "@/lib/validate";

// عکس روی همین رکورد به‌صورت data URL ذخیره می‌شه (بدون استوریج فایل جدا)؛
// این سقف طول رشته رو محدود می‌کنه — کلاینت از قبل عکس رو فشرده می‌کنه
// (lib/image.ts)، این فقط یک شبکه‌ی ایمنی سمت سرور در برابر پیلود بزرگه.
const MAX_SCREENSHOT_DATA_URL_LEN = 2_500_000;

type SharedFields = {
  direction?: "long" | "short";
  entryPrice?: number | null;
  lotSize?: number | null;
  volume?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  riskPercent?: number | null;
  screenshotUrl?: string | null;
};

// اعتبارسنجی مشترک بین ثبت (POST) و ویرایش (PATCH) — تا دوباره‌نویسی نشه
function validateSharedFields(f: SharedFields): string | null {
  if (f.direction !== undefined && f.direction !== "long" && f.direction !== "short") {
    return "جهت معامله نامعتبر است";
  }
  if (f.entryPrice !== undefined && f.entryPrice !== null && (typeof f.entryPrice !== "number" || f.entryPrice <= 0)) {
    return "قیمت ورود باید عدد مثبت باشد";
  }
  if (f.lotSize !== undefined && f.lotSize !== null && (typeof f.lotSize !== "number" || f.lotSize <= 0)) {
    return "لات باید عدد مثبت باشد";
  }
  for (const [label, v] of [["حد ضرر", f.stopLoss], ["حد سود", f.takeProfit], ["درصد ریسک", f.riskPercent], ["حجم معامله", f.volume]] as const) {
    if (v !== undefined && v !== null && (typeof v !== "number" || isNaN(v) || v < 0)) {
      return `${label} نامعتبر است`;
    }
  }
  if (f.screenshotUrl) {
    if (typeof f.screenshotUrl !== "string" || !f.screenshotUrl.startsWith("data:image/")) {
      return "فرمت عکس نامعتبر است";
    }
    if (f.screenshotUrl.length > MAX_SCREENSHOT_DATA_URL_LEN) {
      return "حجم عکس زیاد است";
    }
  }
  return null;
}

// روزهای بعد از امروز مجاز نیستن (گذشته آزاده) — مقایسه در سطح روز، نه لحظه‌ی دقیق
function isFutureDay(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day.getTime() > today.getTime();
}

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

// POST /api/trade/entries  { pair, direction, entryPrice, exitPrice, lotSize, pnl, openedAt, closedAt, notes, ... }
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const {
    pair, direction, entryPrice, exitPrice, lotSize, volume, pnl, openedAt, closedAt, notes,
    stopLoss, takeProfit, riskPercent, strategy, screenshotUrl,
  } = body as {
    pair: string; direction: "long" | "short"; entryPrice: number; exitPrice?: number;
    lotSize: number; volume?: number; pnl?: number; openedAt: string; closedAt?: string; notes?: string;
    stopLoss?: number; takeProfit?: number; riskPercent?: number; strategy?: string; screenshotUrl?: string;
  };

  if (!pair || !direction || !entryPrice || !lotSize || !openedAt) {
    return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
  }
  const openedAtDate = new Date(openedAt);
  if (isNaN(openedAtDate.getTime())) {
    return NextResponse.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
  }
  if (isFutureDay(openedAtDate)) {
    return NextResponse.json({ error: "نمی‌توانی برای تاریخ آینده معامله ثبت کنی" }, { status: 400 });
  }
  const sharedError = validateSharedFields({ direction, entryPrice, lotSize, volume, stopLoss, takeProfit, riskPercent, screenshotUrl });
  if (sharedError) return NextResponse.json({ error: sharedError }, { status: 400 });

  const entry = await prisma.tradeEntry.create({
    data: {
      userId, pair: clampText(pair, 20), direction, entryPrice, lotSize,
      exitPrice: exitPrice ?? null,
      volume: volume ?? null,
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

// PATCH /api/trade/entries  { id, pair, direction, entryPrice, exitPrice, lotSize, pnl, ... }
// ویرایش یک معامله‌ی موجود — عمداً تاریخ (openedAt) رو عوض نمی‌کنه، فقط بقیه‌ی
// فیلدها؛ فرم همیشه کل مقادیر رو می‌فرسته پس این جایگزینی کامله، نه patch جزئی.
export async function PATCH(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json();
  const {
    id, pair, direction, entryPrice, exitPrice, lotSize, volume, pnl, notes,
    stopLoss, takeProfit, riskPercent, strategy, screenshotUrl,
  } = body as {
    id: string; pair: string; direction: "long" | "short"; entryPrice: number | null; exitPrice?: number | null;
    lotSize: number | null; volume?: number | null; pnl?: number | null; notes?: string | null;
    stopLoss?: number | null; takeProfit?: number | null; riskPercent?: number | null; strategy?: string | null; screenshotUrl?: string | null;
  };

  if (!id || !pair || !direction || !entryPrice || !lotSize) {
    return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
  }
  const sharedError = validateSharedFields({ direction, entryPrice, lotSize, volume, stopLoss, takeProfit, riskPercent, screenshotUrl });
  if (sharedError) return NextResponse.json({ error: sharedError }, { status: 400 });

  const existing = await prisma.tradeEntry.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "معامله پیدا نشد" }, { status: 404 });

  const entry = await prisma.tradeEntry.update({
    where: { id },
    data: {
      pair: clampText(pair, 20), direction, entryPrice, lotSize,
      exitPrice: exitPrice ?? null,
      volume: volume ?? null,
      pnl: pnl ?? null,
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
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  await prisma.tradeEntry.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
