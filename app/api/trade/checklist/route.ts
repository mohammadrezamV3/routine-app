import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { clampText } from "@/lib/validate";

const MAX_ITEMS = 40;

// اولین باری که کاربر وارد این بخش می‌شه، لیستش خالی نیست — همون نکات پایه‌ی
// معامله‌گری به‌عنوان نقطه‌شروع seed می‌شه، ولی از همون‌جا کاملاً قابل ویرایش/حذفه
const DEFAULT_ITEMS = [
  "سطح H1 با برخورد قبلی معتبره؟",
  "گره معاملاتی در M5 شکل گرفته؟",
  "کندل تاییدی صادر شده؟",
  "DXY همسوئه یا حداقل واگرایی مشکوک نداره؟",
  "خبر مهمی در ۳۰-۶۰ دقیقه آینده نیست؟",
  "حجم پوزیشن بر اساس ریسک محاسبه شده؟",
  "حد ضرر و هدف سود قبل از ورود مشخصه؟",
];

export async function GET() {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  let items = await prisma.tradeChecklistItem.findMany({ where: { userId }, orderBy: { order: "asc" } });

  if (items.length === 0) {
    await prisma.tradeChecklistItem.createMany({
      data: DEFAULT_ITEMS.map((text, i) => ({ userId, text, order: i })),
    });
    items = await prisma.tradeChecklistItem.findMany({ where: { userId }, orderBy: { order: "asc" } });
  }

  return NextResponse.json({ items });
}

// POST { text } — یه آیتم جدید به انتهای لیست اضافه می‌کنه
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const { text } = (await req.json()) as { text: string };
  if (!text || !text.trim()) return NextResponse.json({ error: "متن آیتم الزامی است" }, { status: 400 });

  const count = await prisma.tradeChecklistItem.count({ where: { userId } });
  if (count >= MAX_ITEMS) {
    return NextResponse.json({ error: `حداکثر ${MAX_ITEMS} آیتم مجاز است` }, { status: 400 });
  }

  const item = await prisma.tradeChecklistItem.create({
    data: { userId, text: clampText(text.trim(), 200), order: count },
  });
  return NextResponse.json({ ok: true, item });
}

// PATCH { id, text } — ویرایش متن یه آیتم
export async function PATCH(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const { id, text } = (await req.json()) as { id: string; text: string };
  if (!id || !text || !text.trim()) return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });

  await prisma.tradeChecklistItem.updateMany({ where: { id, userId }, data: { text: clampText(text.trim(), 200) } });
  return NextResponse.json({ ok: true });
}

// PUT { order: string[] } — ترتیب جدید کل لیست (بعد از جابه‌جایی با دکمه‌های بالا/پایین)
export async function PUT(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const { order } = (await req.json()) as { order: string[] };
  if (!Array.isArray(order)) return NextResponse.json({ error: "ترتیب نامعتبر است" }, { status: 400 });

  await prisma.$transaction(
    order.map((id, i) => prisma.tradeChecklistItem.updateMany({ where: { id, userId }, data: { order: i } }))
  );
  return NextResponse.json({ ok: true });
}

// DELETE ?id=... — حذف یه آیتم
export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  await prisma.tradeChecklistItem.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
