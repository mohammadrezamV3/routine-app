import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { clampText } from "@/lib/validate";
import { isHexColor } from "@/lib/tradeServer";
import { MAX_TAGS } from "@/lib/tradeTypes";

// برچسب‌های کاربر — یک لیستِ واحد که هم روی حساب استفاده می‌شود هم روی
// معامله. نامِ برچسب برای هر کاربر یکتاست (ایندکسِ userId+name)، پس تکراری
// ساخته نمی‌شود؛ خطای یکتاییِ پریزما این‌جا به پیامِ فارسی تبدیل می‌شود.

const TAG_SELECT = { id: true, name: true, color: true } as const;

export async function GET() {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const tags = await prisma.tradeTag.findMany({
    where: { userId: guard.userId },
    orderBy: { createdAt: "asc" },
    select: TAG_SELECT,
  });
  return NextResponse.json({ tags });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const name = clampText(String(body?.name || "").trim(), 30);
  if (!name) return NextResponse.json({ error: "نام برچسب الزامی است" }, { status: 400 });
  const color = isHexColor(body?.color) ? body.color : "#3E7BFA";

  const count = await prisma.tradeTag.count({ where: { userId } });
  if (count >= MAX_TAGS) return NextResponse.json({ error: `حداکثر ${MAX_TAGS} برچسب مجاز است` }, { status: 400 });

  const existing = await prisma.tradeTag.findFirst({ where: { userId, name }, select: TAG_SELECT });
  if (existing) return NextResponse.json({ error: "برچسبی با این نام از قبل هست" }, { status: 400 });

  const tag = await prisma.tradeTag.create({ data: { userId, name, color }, select: TAG_SELECT });
  return NextResponse.json({ ok: true, tag });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  const name = clampText(String(body?.name || "").trim(), 30);
  if (!id || !name) return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });

  const duplicate = await prisma.tradeTag.findFirst({ where: { userId, name, NOT: { id } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "برچسبی با این نام از قبل هست" }, { status: 400 });

  await prisma.tradeTag.updateMany({
    where: { id, userId },
    data: { name, ...(isHexColor(body?.color) ? { color: body.color } : {}) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id الزامی است" }, { status: 400 });
  // اتصالِ برچسب به حساب/معامله با حذفِ خودِ برچسب برداشته می‌شود (cascade
  // روی جدولِ واسط) — خودِ معامله دست‌نخورده می‌ماند.
  await prisma.tradeTag.deleteMany({ where: { id, userId: guard.userId } });
  return NextResponse.json({ ok: true });
}
