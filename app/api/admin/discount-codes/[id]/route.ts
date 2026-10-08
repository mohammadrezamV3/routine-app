import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/adminAnalytics";

// DELETE → حذف کامل. کدهای تخفیف برخلاف ReferralCode به هیچ رکورد دیگه‌ای
// (مثلا Subscription) وصل نیستن — تخفیف اعمال‌شده مستقیم روی خود
// Subscription.discountPercent ذخیره می‌شه، پس حذف کد هیچ تراکنش گذشته‌ای
// رو بی‌اعتبار نمی‌کنه، فقط جلوی استفاده‌ی بعدی رو می‌گیره.
//
// تنها وابسته DiscountCodeUsageه (شمارنده‌ی سقف مصرف هر کاربر، FK بدون
// cascade) — قبلا حذف کدی که حتی یک بار مصرف شده بود با خطای FK شکست
// می‌خورد و چون خطا قورت داده می‌شد، پاسخ ok برمی‌گشت و کد عملا باقی می‌موند.
// شمارنده‌ها بدون خود کد معنایی ندارن، پس با هم در یک تراکنش پاک می‌شن.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("discounts");
  if (!guard.ok) return guard.response;

  const existing = await prisma.discountCode.findUnique({ where: { id: params.id }, select: { id: true, code: true } });
  if (!existing) return NextResponse.json({ error: "کد تخفیف پیدا نشد" }, { status: 404 });

  await prisma.$transaction([
    prisma.discountCodeUsage.deleteMany({ where: { discountCodeId: existing.id } }),
    prisma.discountCode.delete({ where: { id: existing.id } }),
  ]);
  await writeAuditLog(guard.userId, "discount_code.delete", "DiscountCode", existing.id, { code: existing.code });
  return NextResponse.json({ ok: true });
}

// PATCH { active: boolean } → قطع/وصل کد بدون حذف
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("discounts");
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof (body as any).active !== "boolean") {
    return NextResponse.json({ error: "ورودی نامعتبر است" }, { status: 400 });
  }
  const active = (body as { active: boolean }).active;

  const existing = await prisma.discountCode.findUnique({ where: { id: params.id }, select: { id: true, code: true } });
  if (!existing) return NextResponse.json({ error: "کد تخفیف پیدا نشد" }, { status: 404 });

  await prisma.discountCode.update({ where: { id: existing.id }, data: { active } });
  await writeAuditLog(guard.userId, "discount_code.toggle", "DiscountCode", existing.id, { code: existing.code, active });
  return NextResponse.json({ ok: true, active });
}
