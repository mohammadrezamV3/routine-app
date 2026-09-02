import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { prisma } from "@/lib/prisma";

// DELETE → حذف کامل. کدهای تخفیف برخلاف ReferralCode به هیچ رکورد دیگه‌ای
// (مثلا Subscription) وصل نیستن — تخفیف اعمال‌شده مستقیم روی خود
// Subscription.discountPercent ذخیره می‌شه، پس حذف کد هیچ تراکنش گذشته‌ای
// رو بی‌اعتبار نمی‌کنه، فقط جلوی استفاده‌ی بعدی رو می‌گیره.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  await prisma.discountCode.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
