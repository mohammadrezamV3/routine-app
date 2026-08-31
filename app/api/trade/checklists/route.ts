import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { clampText } from "@/lib/validate";
import { isHexColor } from "@/lib/tradeServer";
import { MAX_CHECKLISTS, MAX_CHECKLIST_ITEMS } from "@/lib/tradeTypes";

// چک‌لیست‌های نام‌دارِ کاربر. جایگزینِ /api/trade/checklist (تکی) شده — آن
// نسخه یک لیستِ تختِ واحد برای هر کاربر بود و امکانِ «هر معامله با چک‌لیستِ
// خودش» را نمی‌داد.

const MAX_ITEMS = MAX_CHECKLIST_ITEMS;

const CHECKLIST_SELECT = {
  id: true, name: true, color: true, required: true, archived: true, order: true,
  items: { select: { id: true, text: true, order: true }, orderBy: { order: "asc" } },
} as const;

// چک‌لیستِ پیش‌فرضِ اولین ورود — نقطه‌ی شروع، کاملاً قابلِ ویرایش/حذف
const SEED_NAME = "چک‌لیست من";
const SEED_ITEMS = [
  "سطح H1 با برخورد قبلی معتبره؟",
  "گره معاملاتی در M5 شکل گرفته؟",
  "کندل تاییدی صادر شده؟",
  "DXY همسوئه یا حداقل واگرایی مشکوک نداره؟",
  "خبر مهمی در ۳۰-۶۰ دقیقه آینده نیست؟",
  "حجم پوزیشن بر اساس ریسک محاسبه شده؟",
  "حد ضرر و هدف سود قبل از ورود مشخصه؟",
];

function parseItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (typeof t === "string" ? t : t?.text))
    .filter((t: unknown): t is string => typeof t === "string" && !!t.trim())
    .slice(0, MAX_ITEMS)
    .map((t) => clampText(t.trim(), 200));
}

export async function GET() {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  let checklists = await prisma.tradeChecklist.findMany({
    where: { userId },
    orderBy: [{ archived: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    select: CHECKLIST_SELECT,
  });

  if (checklists.length === 0) {
    await prisma.tradeChecklist.create({
      data: {
        userId, name: SEED_NAME, order: 0,
        items: { create: SEED_ITEMS.map((text, i) => ({ text, order: i })) },
      },
    });
    checklists = await prisma.tradeChecklist.findMany({
      where: { userId }, orderBy: { order: "asc" }, select: CHECKLIST_SELECT,
    });
  }

  return NextResponse.json({ checklists });
}

// POST { name, color?, required?, items?: string[], duplicateOf?: string }
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const count = await prisma.tradeChecklist.count({ where: { userId, archived: false } });
  if (count >= MAX_CHECKLISTS) {
    return NextResponse.json({ error: `حداکثر ${MAX_CHECKLISTS} چک‌لیست مجاز است` }, { status: 400 });
  }

  let items = parseItems(body?.items);
  let name = clampText(String(body?.name || "").trim(), 60);
  let color = isHexColor(body?.color) ? body.color : "#3E7BFA";

  // «Duplicate» — کپیِ کاملِ یک چک‌لیستِ موجود با نامِ جدید
  if (body?.duplicateOf) {
    const src = await prisma.tradeChecklist.findFirst({
      where: { id: String(body.duplicateOf), userId },
      select: { name: true, color: true, items: { select: { text: true }, orderBy: { order: "asc" } } },
    });
    if (!src) return NextResponse.json({ error: "چک‌لیست پیدا نشد" }, { status: 404 });
    items = src.items.map((i) => i.text);
    name = name || clampText(`${src.name} (کپی)`, 60);
    color = src.color;
  }

  if (!name) return NextResponse.json({ error: "نام چک‌لیست الزامی است" }, { status: 400 });

  const checklist = await prisma.tradeChecklist.create({
    data: {
      userId, name, color,
      required: !!body?.required,
      order: count,
      items: { create: items.map((text, i) => ({ text, order: i })) },
    },
    select: CHECKLIST_SELECT,
  });
  return NextResponse.json({ ok: true, checklist });
}

// PATCH { id, name?, color?, required?, archived?, items?: string[] }
//
// آیتم‌ها یکجا جایگزین می‌شوند: ویرایشگر همیشه لیستِ نهایی را می‌فرستد و
// این کار هم ترتیب و هم افزودن/حذف را در یک درخواست حل می‌کند. اسنپ‌شاتِ
// معاملاتِ قبلی از این تغییر اثر نمی‌گیرد (متنشان جداگانه ذخیره شده).
export async function PATCH(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });

  const existing = await prisma.tradeChecklist.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "چک‌لیست پیدا نشد" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = clampText(body.name.trim(), 60);
  if (isHexColor(body.color)) data.color = body.color;
  if (typeof body.required === "boolean") data.required = body.required;
  if (typeof body.archived === "boolean") data.archived = body.archived;

  const hasItems = Array.isArray(body.items);
  const items = hasItems ? parseItems(body.items) : [];

  const checklist = await prisma.$transaction(async (tx) => {
    if (hasItems) {
      await tx.tradeChecklistItem.deleteMany({ where: { checklistId: id } });
      if (items.length) {
        await tx.tradeChecklistItem.createMany({
          data: items.map((text, i) => ({ checklistId: id, text, order: i })),
        });
      }
    }
    return tx.tradeChecklist.update({ where: { id }, data, select: CHECKLIST_SELECT });
  });

  return NextResponse.json({ ok: true, checklist });
}

// DELETE ?id=...
export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });
  // معاملاتِ متصل پاک نمی‌شوند — checklistId شان null می‌شود (SetNull) ولی
  // اسنپ‌شاتِ متنِ چک‌لیست روی خودِ معامله باقی می‌ماند.
  await prisma.tradeChecklist.deleteMany({ where: { id, userId: guard.userId } });
  return NextResponse.json({ ok: true });
}
