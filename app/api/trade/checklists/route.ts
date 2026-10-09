import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { clampText } from "@/lib/validate";
import { isHexColor } from "@/lib/tradeServer";
import { MAX_CHECKLISTS, MAX_CHECKLIST_ITEMS, MIN_CHECKLIST_ITEMS } from "@/lib/tradeTypes";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { tr } from "@/lib/i18n";

// چک‌لیست‌های نام‌دار کاربر. جایگزین /api/trade/checklist (تکی) شده — آن
// نسخه یک لیست تخت واحد برای هر کاربر بود و امکان «هر معامله با چک‌لیست
// خودش» را نمی‌داد.

const MAX_ITEMS = MAX_CHECKLIST_ITEMS;

const CHECKLIST_SELECT = {
  id: true, name: true, color: true, required: true, archived: true, order: true, note: true,
  items: { select: { id: true, text: true, order: true, checked: true }, orderBy: { order: "asc" } },
} as const;

// چک‌لیست پیش‌فرض اولین ورود — نقطه‌ی شروع، کاملا قابل ویرایش/حذف
const seedName = () => tr("چک‌لیست من", "My checklist");
const SEED_FLAG_KEY = "tradeChecklistSeeded";
const seedItems = () => [
  tr("سطح H1 با برخورد قبلی معتبره؟", "Is the H1 level valid with a previous touch?"),
  tr("گره معاملاتی در M5 شکل گرفته؟", "Has a trading node formed on M5?"),
  tr("کندل تاییدی صادر شده؟", "Has a confirmation candle printed?"),
  tr("DXY همسوئه یا حداقل واگرایی مشکوک نداره؟", "Is DXY aligned, or at least free of suspicious divergence?"),
  tr("خبر مهمی در 30-60 دقیقه آینده نیست؟", "No major news in the next 30-60 minutes?"),
  tr("حجم پوزیشن بر اساس ریسک محاسبه شده؟", "Is the position size calculated from risk?"),
  tr("حد ضرر و هدف سود قبل از ورود مشخصه؟", "Are stop loss and take profit set before entry?"),
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
  { const off = await sessionFeatureBlocked("tradeChecklists"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  let checklists = await prisma.tradeChecklist.findMany({
    where: { userId },
    orderBy: [{ archived: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    select: CHECKLIST_SELECT,
  });

  // چک‌لیست پیش‌فرض فقط *یک‌بار* برای هر کاربر ساخته می‌شود.
  //
  // قبلا شرط فقط «لیست خالی است» بود، یعنی وقتی کاربر آخرین چک‌لیستش را پاک
  // می‌کرد، همین GET بعدی دوباره می‌ساختش — از بیرون دقیقا شبیه این بود که
  // حذف کار نمی‌کند و چک‌لیست برمی‌گردد. حالا یک نشانه‌ی سرور-مدیریت
  // (UserSetting: tradeChecklistSeeded) می‌گوید سید قبلا انجام شده یا نه.
  if (checklists.length === 0) {
    const seeded = await prisma.userSetting.findUnique({
      where: { userId_key: { userId, key: SEED_FLAG_KEY } },
      select: { value: true },
    });
    if (!seeded) {
      await prisma.tradeChecklist.create({
        data: {
          userId, name: seedName(), order: 0,
          items: { create: seedItems().map((text, i) => ({ text, order: i })) },
        },
      });
      await prisma.userSetting.upsert({
        where: { userId_key: { userId, key: SEED_FLAG_KEY } },
        create: { userId, key: SEED_FLAG_KEY, value: true },
        update: { value: true },
      });
      checklists = await prisma.tradeChecklist.findMany({
        where: { userId }, orderBy: { order: "asc" }, select: CHECKLIST_SELECT,
      });
    }
  }

  return NextResponse.json({ checklists });
}

// POST { name, color?, required?, items?: string[], duplicateOf?: string }
async function handlePOST(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeChecklists"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const count = await prisma.tradeChecklist.count({ where: { userId, archived: false } });
  if (count >= MAX_CHECKLISTS) {
    return NextResponse.json({ error: tr(tr(`حداکثر ${MAX_CHECKLISTS} چک‌لیست مجاز است`, `You can have up to ${MAX_CHECKLISTS} checklists`), `You can have up to ${MAX_CHECKLISTS} checklists`) }, { status: 400 });
  }

  let items = parseItems(body?.items);
  let name = clampText(String(body?.name || "").trim(), 60);
  let color = isHexColor(body?.color) ? body.color : "#3E7BFA";
  let note = typeof body?.note === "string" && body.note.trim() ? clampText(body.note.trim(), 2000) : null;

  // «Duplicate» — کپی کامل یک چک‌لیست موجود با نام جدید
  if (body?.duplicateOf) {
    const src = await prisma.tradeChecklist.findFirst({
      where: { id: String(body.duplicateOf), userId },
      select: { name: true, color: true, note: true, items: { select: { text: true }, orderBy: { order: "asc" } } },
    });
    if (!src) return NextResponse.json({ error: tr(tr("چک‌لیست پیدا نشد", "Checklist not found"), "Checklist not found") }, { status: 404 });
    items = src.items.map((i) => i.text);
    name = name || clampText(`${src.name} (کپی)`, 60);
    color = src.color;
    note = src.note;
  }

  if (!name) return NextResponse.json({ error: tr(tr("نام چک‌لیست الزامی است", "Checklist name is required"), "Checklist name is required") }, { status: 400 });
  if (items.length < MIN_CHECKLIST_ITEMS) {
    return NextResponse.json({ error: tr(tr(`چک‌لیست باید حداقل ${MIN_CHECKLIST_ITEMS} مورد داشته باشد`, `A checklist must have at least ${MIN_CHECKLIST_ITEMS} items`), `A checklist must have at least ${MIN_CHECKLIST_ITEMS} items`) }, { status: 400 });
  }

  const checklist = await prisma.tradeChecklist.create({
    data: {
      userId, name, color, note,
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
// آیتم‌ها یکجا جایگزین می‌شوند: ویرایشگر همیشه لیست نهایی را می‌فرستد و
// این کار هم ترتیب و هم افزودن/حذف را در یک درخواست حل می‌کند. اسنپ‌شات
// معاملات قبلی از این تغییر اثر نمی‌گیرد (متنشان جداگانه ذخیره شده).
async function handlePATCH(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeChecklists"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: tr(tr("id الزامی است", "id is required"), "id is required") }, { status: 400 });

  const existing = await prisma.tradeChecklist.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: tr(tr("چک‌لیست پیدا نشد", "Checklist not found"), "Checklist not found") }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = clampText(body.name.trim(), 60);
  if (isHexColor(body.color)) data.color = body.color;
  if (typeof body.required === "boolean") data.required = body.required;
  if (typeof body.archived === "boolean") data.archived = body.archived;
  if (typeof body.note === "string") data.note = body.note.trim() ? clampText(body.note.trim(), 2000) : null;

  const hasItems = Array.isArray(body.items);
  const items = hasItems ? parseItems(body.items) : [];
  if (hasItems && items.length < MIN_CHECKLIST_ITEMS) {
    return NextResponse.json({ error: tr(tr(`چک‌لیست باید حداقل ${MIN_CHECKLIST_ITEMS} مورد داشته باشد`, `A checklist must have at least ${MIN_CHECKLIST_ITEMS} items`), `A checklist must have at least ${MIN_CHECKLIST_ITEMS} items`) }, { status: 400 });
  }

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
async function handleDELETE(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeChecklists"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: tr(tr("id الزامی است", "id is required"), "id is required") }, { status: 400 });
  // معاملات متصل پاک نمی‌شوند — checklistId شان null می‌شود (SetNull) ولی
  // اسنپ‌شات متن چک‌لیست روی خود معامله باقی می‌ماند.
  await prisma.tradeChecklist.deleteMany({ where: { id, userId: guard.userId } });
  return NextResponse.json({ ok: true });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["trade"], handlePOST);
export const PATCH = withLiveSync(["trade"], handlePATCH);
export const DELETE = withLiveSync(["trade"], handleDELETE);
