import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { withLiveSync } from "@/lib/realtime";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { tr } from "@/lib/i18n";

// PATCH /api/trade/checklists/[id]/items  { itemId, checked } | { resetAll: true }
//
// وضعیت «تیک‌زده» یک آیتم — جدا از PATCH اصلی چک‌لیست (که برای ویرایش
// متن/ترتیب، همه‌ی آیتم‌ها را حذف و دوباره می‌سازد و این تیک‌ها را هم پاک
// می‌کرد). این‌جا فقط همان یک ردیف را update می‌کند، پس تیک‌زدن هیچ‌وقت
// چک‌لیست را دوباره نمی‌سازد و برعکس.
//
// resetAll برای شروع یک اجرای تازه (بعد ثبت معامله) است — چک‌لیست همان
// روز قبل نباید از قبل تیک‌خورده به‌نظر برسد.
async function handlePATCH(req: NextRequest, { params }: { params: { id: string } }) {
  { const off = await sessionFeatureBlocked("tradeChecklists"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const checklist = await prisma.tradeChecklist.findFirst({
    where: { id: params.id, userId: guard.userId },
    select: { id: true },
  });
  if (!checklist) return NextResponse.json({ error: tr(tr("چک‌لیست پیدا نشد", "Checklist not found"), "Checklist not found") }, { status: 404 });

  const body = await req.json().catch(() => null);

  if (body?.resetAll === true) {
    await prisma.tradeChecklistItem.updateMany({
      where: { checklistId: params.id },
      data: { checked: false },
    });
    return NextResponse.json({ ok: true });
  }

  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  if (!itemId || typeof body?.checked !== "boolean") {
    return NextResponse.json({ error: tr("درخواست نامعتبر است", "Invalid request") }, { status: 400 });
  }

  const updated = await prisma.tradeChecklistItem.updateMany({
    where: { id: itemId, checklistId: params.id },
    data: { checked: body.checked },
  });
  if (updated.count === 0) return NextResponse.json({ error: tr(tr("آیتم پیدا نشد", "Item not found"), "Item not found") }, { status: 404 });

  return NextResponse.json({ ok: true });
}

// بعد از هر نوشتن موفق، بقیه‌ی دستگاه‌ها/تب‌های همین کاربر با WebSocket خبردار می‌شن (lib/realtime.ts)
export const PATCH = withLiveSync(["trade"], handlePATCH);
