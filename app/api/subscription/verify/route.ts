import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { zarinpalVerifyPayment } from "@/lib/zarinpal";
import { activatePaidSubscription } from "@/lib/subscriptionActivation";
import { DURATIONS, type Duration } from "@/lib/planPricing";

// پنل Owner › تراکنش‌ها/Funnel — تنها جایی که پرداختِ ناموفق/رهاشده واقعاً
// جایی ثبت می‌شه؛ جدولِ Payment فقط پرداختِ verify-شده‌ی موفق رو داره
// (هیچ ردیفی برای تلاشِ ناموفق ساخته نمی‌شه)، پس بدونِ این رویداد، «تراکنشِ
// ناموفق» یه حالتِ کاملاً نامرئی توی دیتابیس بود.
function logCheckoutFailed(userId: string | undefined, reason: string) {
  prisma.analyticsEvent.create({ data: { userId: userId || null, type: "checkout_failed", meta: { reason } } }).catch(() => {});
}

// GET /api/subscription/verify → مرورگرِ کاربر بعدِ پرداخت از زرین‌پال
// اینجا برمی‌گرده (Authority/Status توی query). مبلغ رو مستقیم از همون
// query که خودمون موقعِ ساختِ callback_url ساختیم می‌خونیم — امنیتش با
// verifyِ خودِ زرین‌پال تضمین می‌شه (اگه کسی این مبلغ رو دستکاری کنه،
// verify روی زرین‌پال با مبلغِ واقعاً پرداخت‌شده مچ نمی‌شه و fail می‌شه).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const { searchParams } = req.nextUrl;
  const redirectBase = new URL("/subscription", req.nextUrl.origin);

  if (!userId) {
    logCheckoutFailed(undefined, "no_session");
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }

  const status = searchParams.get("Status");
  const authority = searchParams.get("Authority");
  const planKey = searchParams.get("planKey");
  const duration = searchParams.get("duration") as Duration | null;
  const amount = Number(searchParams.get("amount"));
  const discountPercent = Number(searchParams.get("discountPercent") || 0);
  const referralUsageId = searchParams.get("referralUsageId") || undefined;

  if (status !== "OK" || !authority || !planKey || !duration || !DURATIONS.includes(duration) || !amount) {
    logCheckoutFailed(userId, status === "OK" ? "invalid_params" : "gateway_canceled_or_error");
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }

  let verified: { ok: boolean; refId?: string };
  try {
    verified = await zarinpalVerifyPayment({ amountRial: amount, authority });
  } catch {
    logCheckoutFailed(userId, "verify_request_error");
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }
  if (!verified.ok) {
    logCheckoutFailed(userId, "verify_rejected");
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }

  // مقدارِ کیفِ اعتبارِ این خرید رو فقط از PendingCheckout (سمتِ سرور) می‌خونیم،
  // نه از query — کاربر نمی‌تونه این مبلغ رو دستکاری کنه. حذف = مصرف، پس
  // یک verify تکراری/replay‌شده با همون authority این بار چیزی پیدا نمی‌کنه
  // و walletApplied صفر می‌شه (دوباره کسر نمی‌شه).
  const pending = await prisma.pendingCheckout.findUnique({ where: { authority } });
  const walletApplied = pending?.walletApplied ?? 0;
  if (pending) {
    await prisma.pendingCheckout.delete({ where: { authority } }).catch(() => {});
  }

  let result: { subscriptionId: string; paymentId: string };
  try {
    result = await activatePaidSubscription({
      userId,
      planKey,
      duration,
      discountPercent,
      referralUsageId,
      amountCharged: amount,
      walletApplied,
      provider: "zarinpal",
      providerRef: verified.refId,
    });
  } catch {
    logCheckoutFailed(userId, "plan_not_found");
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }

  redirectBase.searchParams.set("checkout", "success");
  redirectBase.searchParams.set("sub", result.subscriptionId);
  return NextResponse.redirect(redirectBase);
}
