import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { zibalVerify } from "@/lib/zibal";
import { getSiteUrl } from "@/lib/siteUrl";
import { isDuration, PRICING_LIMITS } from "@/lib/planPricing";
import { verifyCheckoutSignature } from "@/lib/checkoutSignature";
import { activateSubscription } from "@/lib/subscriptionActivation";

// پنل Owner › تراکنش‌ها/Funnel — تنها جایی که پرداخت ناموفق/رهاشده واقعا
// جایی ثبت می‌شه؛ جدول Payment فقط پرداخت verify-شده‌ی موفق رو داره
// (هیچ ردیفی برای تلاش ناموفق ساخته نمی‌شه)، پس بدون این رویداد، «تراکنش
// ناموفق» یه حالت کاملا نامرئی توی دیتابیس بود.
function logCheckoutFailed(userId: string | undefined, reason: string) {
  prisma.analyticsEvent.create({ data: { userId: userId || null, type: "checkout_failed", meta: { reason } } }).catch(() => {});
}

// GET /api/subscription/verify → مرورگر کاربر بعد پرداخت از زیبال
// اینجا برمی‌گرده (trackId/success توی query). پلن/مدت/مبلغ/تخفیف همه با
// امضای HMAC خود این اپ تضمین می‌شن (lib/checkoutSignature.ts) — زیبال فقط
// تضمین می‌کنه «مبلغ» با پرداخت واقعی یکیه، نه این‌که این مبلغ قیمت کدوم
// پلن بوده.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const { searchParams } = req.nextUrl;

  // آدرس پایه از NEXTAUTH_URL می‌آید، نه از origin درخواست.
  //
  // باگی که این حل می‌کند: کاربر بعد از پرداخت **صفحه‌ی سفید** می‌دید. اپ
  // پشت nginx است، پس `req.nextUrl.origin` می‌توانست `http://127.0.0.1:3000`
  // دربیاید — و مرورگر کاربر به آن آدرس ریدایرکت می‌شد، که روی دستگاه خودش
  // هیچ چیزی نیست. همان ریشه‌ای که آدرس بازگشت درگاه را هم شکسته بود
  // (lib/siteUrl.ts).
  const siteUrl = getSiteUrl(req.nextUrl.origin);

  /**
   * برگشت ناموفق **به صفحه‌ی انتخاب درگاه**، نه به فهرست اشتراک‌ها.
   *
   * چرا: کاربری که پرداختش نگرفته معمولا می‌خواهد همان لحظه دوباره امتحان
   * کند (شاید با درگاه دیگر). فرستادنش به `/subscription` یعنی باید کل
   * مسیر انتخاب پلن و مدت و کد تخفیف را از اول برود. با نگه‌داشتن
   * plan/duration، دقیقا همان‌جایی برمی‌گردد که بود.
   *
   * اگر پلن/مدت معلوم نباشد (مثلا سشن منقضی شده)، فهرست اشتراک تنها جای
   * معنادار است.
   */
  function failRedirect(reason: string, uid?: string, plan?: string | null, dur?: string | null) {
    logCheckoutFailed(uid, reason);
    const url = plan && dur
      ? new URL(`/subscription/checkout?plan=${encodeURIComponent(plan)}&duration=${encodeURIComponent(dur)}`, siteUrl)
      : new URL("/subscription", siteUrl);
    url.searchParams.set("checkout", "failed");
    return NextResponse.redirect(url);
  }

  if (!userId) {
    return failRedirect("no_session", undefined);
  }

  const planKey = searchParams.get("planKey");
  const durationRaw = searchParams.get("duration");
  const duration = isDuration(durationRaw) ? durationRaw : null;
  // تعداد ماه موقع پرداخت از پنل خونده و امضا شده — نه از پیکربندی فعلی، تا
  // تغییر ادمین وسط پرداخت چیزی که کاربر پولش رو داده عوض نکنه.
  const months = Number(searchParams.get("months"));
  const amount = Number(searchParams.get("amount"));
  const discountPercent = Number(searchParams.get("discountPercent") || 0);
  const referralUsageId = searchParams.get("referralUsageId") || undefined;
  const discountCodeId = searchParams.get("discountCodeId") || undefined;
  const upgradeFromSubId = searchParams.get("upgradeFromSubId") || undefined;
  const achievementRewardId = searchParams.get("achievementRewardId") || undefined;
  const walletApplied = Number(searchParams.get("walletApplied") || 0);

  if (!planKey || !duration || !amount || !Number.isInteger(months) || months < PRICING_LIMITS.minMonths || months > PRICING_LIMITS.maxMonths) {
    return failRedirect("invalid_params", userId, planKey, durationRaw);
  }
  // پلن/مدت/مبلغ/تخفیف/مبلغِ کیف همه با امضای checkout مطابقت داده می‌شن؛
  // زیبال فقط مبلغ رو تضمین می‌کنه، نه این‌که این مبلغ قیمت کدوم پلن بوده.
  if (!verifyCheckoutSignature({ userId, planKey, duration, months, amount, discountPercent, referralUsageId, discountCodeId, upgradeFromSubId, achievementRewardId, walletApplied }, searchParams.get("sig"))) {
    return failRedirect("bad_signature", userId, planKey, duration);
  }

  let verified: { ok: boolean; refId?: string };
  try {
    const trackId = searchParams.get("trackId");
    const success = searchParams.get("success");
    if (!trackId || success !== "1") {
      return failRedirect("gateway_canceled_or_error", userId, planKey, duration);
    }
    const result = await zibalVerify(Number(trackId));
    // زیبال مبلغ رو به verify نمی‌گیره، فقط توی جواب برمی‌گردونه — پس
    // تطبیق مبلغ رو خودمون اینجا چک می‌کنیم (تضمین امنیتی مقابل دستکاری).
    verified = result.ok && result.amount === amount
      ? { ok: true, refId: String(result.refNumber ?? trackId) }
      : { ok: false };
  } catch {
    return failRedirect("verify_request_error", userId, planKey, duration);
  }
  if (!verified.ok) {
    return failRedirect("verify_rejected", userId, planKey, duration);
  }

  let result: { subscriptionId: string };
  try {
    result = await activateSubscription({
      userId,
      planKey,
      months,
      discountPercent,
      referralUsageId,
      discountCodeId,
      achievementRewardId,
      upgradeFromSubId,
      amountCharged: amount,
      walletApplied,
      provider: "zibal",
      providerRef: verified.refId,
    });
  } catch {
    return failRedirect("plan_not_found", userId, planKey, duration);
  }

  const okUrl = new URL("/subscription", siteUrl);
  okUrl.searchParams.set("checkout", "success");
  okUrl.searchParams.set("sub", result.subscriptionId);
  return NextResponse.redirect(okUrl);
}
