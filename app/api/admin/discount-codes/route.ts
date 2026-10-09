import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { ensureEventDiscounts, getEventDiscountState } from "@/lib/eventDiscountServer";
import { tr } from "@/lib/i18n";

// GET → لیست همه‌ی کدهای تخفیف + لیست پلن‌های ایران (برای پرکردن سلکت
// «کدوم پکیج») یک‌جا برمی‌گرده تا صفحه‌ی ادمین با یک درخواست کامل رندر بشه.
export async function GET() {
  const guard = await requireAdmin("discounts");
  if (!guard.ok) return guard.response;

  await ensureEventDiscounts();
  const [codes, plans, evState] = await Promise.all([
    prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.plan.findMany({ where: { market: "IRAN" }, orderBy: { sortOrder: "asc" }, select: { key: true, nameFa: true } }),
    getEventDiscountState(),
  ]);
  // کدهای ساخته‌شده‌ی خودکار مناسبت‌ها (برای نشان «مناسبت» در لیست)
  const eventCodes = Array.from(new Set(Object.values(evState.generated)));
  return NextResponse.json({ codes, plans, eventCodes });
}

// POST → ساخت کد تخفیف جدید. عمدا هیچ‌جا انقضا/پلن رو اجباری نمی‌کنه —
// expiresAt خالی یعنی بدون انقضا، planKey خالی یعنی روی همه‌ی پکیج‌ها.
export async function POST(req: NextRequest) {
  const guard = await requireAdmin("discounts");
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: tr("درخواست نامعتبر است", "Invalid request") }, { status: 400 });
  }
  const { code, percentOff, planKey, expiresAt, maxUsesPerUser } = body as {
    code?: string; percentOff?: number; planKey?: string | null; expiresAt?: string | null; maxUsesPerUser?: number | null;
  };

  const trimmedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (trimmedCode.length < 3 || trimmedCode.length > 32) {
    return NextResponse.json({ error: tr("کد باید بین 3 تا 32 کاراکتر باشد", "The code must be between 3 and 32 characters") }, { status: 400 });
  }
  // کاربر این کد رو دستی توی چک‌اوت تایپ می‌کنه — فاصله/کاراکتر فارسی یعنی
  // کدی که عملا هیچ‌وقت درست وارد نمی‌شه.
  if (!/^[A-Z0-9_-]+$/.test(trimmedCode)) {
    return NextResponse.json({ error: tr("کد فقط می‌تواند شامل حروف انگلیسی، عدد، - و _ باشد", "The code can only contain English letters, numbers, - and _") }, { status: 400 });
  }
  const percent = Number(percentOff);
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    return NextResponse.json({ error: tr("درصد تخفیف باید بین 1 تا 100 باشد", "The discount percentage must be between 1 and 100") }, { status: 400 });
  }
  let expiresAtDate: Date | null = null;
  if (expiresAt) {
    expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      return NextResponse.json({ error: tr("تاریخ انقضا معتبر نیست", "Expiry date is not valid") }, { status: 400 });
    }
    if (expiresAtDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: tr("تاریخ انقضا باید در آینده باشد", "Expiry date must be in the future") }, { status: 400 });
    }
  }
  let maxUses: number | null = null;
  if (maxUsesPerUser !== null && maxUsesPerUser !== undefined && String(maxUsesPerUser) !== "") {
    maxUses = Number(maxUsesPerUser);
    if (!Number.isInteger(maxUses) || maxUses < 1) {
      return NextResponse.json({ error: tr("حداکثر دفعات مصرف باید عدد صحیح حداقل 1 باشد", "Maximum uses must be a whole number, at least 1") }, { status: 400 });
    }
  }

  const normalizedPlanKey = typeof planKey === "string" && planKey.trim() ? planKey.trim() : null;
  if (normalizedPlanKey) {
    const plan = await prisma.plan.findFirst({ where: { key: normalizedPlanKey, market: "IRAN" }, select: { id: true } });
    if (!plan) return NextResponse.json({ error: tr("پکیج انتخاب‌شده وجود ندارد", "The selected package does not exist") }, { status: 400 });
  }

  const existing = await prisma.discountCode.findUnique({ where: { code: trimmedCode } });
  if (existing) {
    return NextResponse.json({ error: tr("این کد قبلا ساخته شده", "This code was already created") }, { status: 409 });
  }

  let created;
  try {
    created = await prisma.discountCode.create({
      data: {
        code: trimmedCode,
        percentOff: percent,
        planKey: normalizedPlanKey,
        expiresAt: expiresAtDate,
        maxUsesPerUser: maxUses,
      },
    });
  } catch (e: any) {
    // دو درخواست هم‌زمان با یک کد — findUnique بالا هر دو رو رد نمی‌کنه
    if (e?.code === "P2002") return NextResponse.json({ error: tr("این کد قبلا ساخته شده", "This code was already created") }, { status: 409 });
    throw e;
  }
  await writeAuditLog(guard.userId, "discount_code.create", "DiscountCode", created.id, {
    code: created.code, percentOff: created.percentOff, planKey: created.planKey, maxUsesPerUser: created.maxUsesPerUser,
  });
  return NextResponse.json({ code: created });
}
