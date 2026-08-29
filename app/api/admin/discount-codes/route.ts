import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { prisma } from "@/lib/prisma";

// GET → لیستِ همه‌ی کدهای تخفیف + لیستِ پلن‌های ایران (برای پرکردنِ سلکتِ
// «کدوم پکیج») یک‌جا برمی‌گرده تا صفحه‌ی ادمین با یک درخواست کامل رندر بشه.
export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const [codes, plans] = await Promise.all([
    prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.plan.findMany({ where: { market: "IRAN" }, orderBy: { sortOrder: "asc" }, select: { key: true, nameFa: true } }),
  ]);
  return NextResponse.json({ codes, plans });
}

// POST → ساختِ کدِ تخفیفِ جدید. عمداً هیچ‌جا انقضا/پلن رو اجباری نمی‌کنه —
// expiresAt خالی یعنی بدونِ انقضا، planKey خالی یعنی روی همه‌ی پکیج‌ها.
export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { code, percentOff, planKey, expiresAt } = body as {
    code?: string; percentOff?: number; planKey?: string | null; expiresAt?: string | null;
  };

  const trimmedCode = code?.trim().toUpperCase();
  if (!trimmedCode || trimmedCode.length < 3) {
    return NextResponse.json({ error: "کد باید حداقل ۳ کاراکتر باشد" }, { status: 400 });
  }
  const percent = Number(percentOff);
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    return NextResponse.json({ error: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد" }, { status: 400 });
  }
  let expiresAtDate: Date | null = null;
  if (expiresAt) {
    expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      return NextResponse.json({ error: "تاریخ انقضا معتبر نیست" }, { status: 400 });
    }
  }

  const existing = await prisma.discountCode.findUnique({ where: { code: trimmedCode } });
  if (existing) {
    return NextResponse.json({ error: "این کد قبلاً ساخته شده" }, { status: 409 });
  }

  const created = await prisma.discountCode.create({
    data: {
      code: trimmedCode,
      percentOff: percent,
      planKey: planKey?.trim() || null,
      expiresAt: expiresAtDate,
    },
  });
  return NextResponse.json({ code: created });
}
