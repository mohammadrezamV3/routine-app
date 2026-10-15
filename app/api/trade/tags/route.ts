import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { clampText } from "@/lib/validate";
import { isHexColor } from "@/lib/tradeServer";
import { MAX_TAGS } from "@/lib/tradeTypes";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { tr } from "@/lib/i18n";

// برچسب‌های کاربر — یک لیست واحد که هم روی حساب استفاده می‌شود هم روی
// معامله. نام برچسب برای هر کاربر یکتاست (ایندکس userId+name)، پس تکراری
// ساخته نمی‌شود؛ خطای یکتایی پریزما این‌جا به پیام فارسی تبدیل می‌شود.

const TAG_SELECT = { id: true, name: true, color: true } as const;

export async function GET() {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const tags = await prisma.tradeTag.findMany({
    where: { userId: guard.userId },
    orderBy: { createdAt: "asc" },
    select: TAG_SELECT,
  });
  return NextResponse.json({ tags });
}

async function handlePOST(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const name = clampText(String(body?.name || "").trim(), 30);
  if (!name) return NextResponse.json({ error: tr(tr("نام برچسب الزامی است", "Tag name is required"), "Tag name is required") }, { status: 400 });
  const color = isHexColor(body?.color) ? body.color : "#3E7BFA";

  const count = await prisma.tradeTag.count({ where: { userId } });
  if (count >= MAX_TAGS) return NextResponse.json({ error: tr(tr(`حداکثر ${MAX_TAGS} برچسب مجاز است`, `You can have up to ${MAX_TAGS} tags`), `You can have up to ${MAX_TAGS} tags`) }, { status: 400 });

  const existing = await prisma.tradeTag.findFirst({ where: { userId, name }, select: TAG_SELECT });
  if (existing) return NextResponse.json({ error: tr(tr("برچسبی با این نام از قبل هست", "A tag with this name already exists"), "A tag with this name already exists") }, { status: 400 });

  const tag = await prisma.tradeTag.create({ data: { userId, name, color }, select: TAG_SELECT });
  return NextResponse.json({ ok: true, tag });
}

async function handlePATCH(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  const name = clampText(String(body?.name || "").trim(), 30);
  if (!id || !name) return NextResponse.json({ error: tr(tr("اطلاعات ناقص است", "Incomplete information"), "Incomplete information") }, { status: 400 });

  const duplicate = await prisma.tradeTag.findFirst({ where: { userId, name, NOT: { id } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: tr(tr("برچسبی با این نام از قبل هست", "A tag with this name already exists"), "A tag with this name already exists") }, { status: 400 });

  await prisma.tradeTag.updateMany({
    where: { id, userId },
    data: { name, ...(isHexColor(body?.color) ? { color: body.color } : {}) },
  });
  return NextResponse.json({ ok: true });
}

async function handleDELETE(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeJournal"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: tr(tr("id الزامی است", "id is required"), "id is required") }, { status: 400 });
  // اتصال برچسب به حساب/معامله با حذف خود برچسب برداشته می‌شود (cascade
  // روی جدول واسط) — خود معامله دست‌نخورده می‌ماند.
  await prisma.tradeTag.deleteMany({ where: { id, userId: guard.userId } });
  return NextResponse.json({ ok: true });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const POST = withLiveSync(["trade"], handlePOST);
export const PATCH = withLiveSync(["trade"], handlePATCH);
export const DELETE = withLiveSync(["trade"], handleDELETE);
