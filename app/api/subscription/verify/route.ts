import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { zarinpalVerifyPayment } from "@/lib/zarinpal";
import { zibalVerify } from "@/lib/zibal";
import { getSiteUrl } from "@/lib/siteUrl";
import type { Duration } from "@/lib/planPricing";

const DURATION_MONTHS: Record<Duration, number> = { "1": 1, "3": 3, "6": 6, "12": 12 };

// پنل Owner › تراکنش‌ها/Funnel — تنها جایی که پرداخت ناموفق/رهاشده واقعا
// جایی ثبت می‌شه؛ جدول Payment فقط پرداخت verify-شده‌ی موفق رو داره
// (هیچ ردیفی برای تلاش ناموفق ساخته نمی‌شه)، پس بدون این رویداد، «تراکنش
// ناموفق» یه حالت کاملا نامرئی توی دیتابیس بود.
function logCheckoutFailed(userId: string | undefined, reason: string) {
  prisma.analyticsEvent.create({ data: { userId: userId || null, type: "checkout_failed", meta: { reason } } }).catch(() => {});
}

// GET /api/subscription/verify → مرورگر کاربر بعد پرداخت از زرین‌پال
// اینجا برمی‌گرده (Authority/Status توی query). مبلغ رو مستقیم از همون
// query که خودمون موقع ساخت callback_url ساختیم می‌خونیم — امنیتش با
// verify خود زرین‌پال تضمین می‌شه (اگه کسی این مبلغ رو دستکاری کنه،
// verify روی زرین‌پال با مبلغ واقعا پرداخت‌شده مچ نمی‌شه و fail می‌شه).
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

  // درگاه از همون callbackUrlی که خودمون موقع ساخت درخواست ساختیم میاد —
  // نه چیزی که کاربر/درگاه بتونه دستکاری کنه به‌نفع خودش، چون verify هنوزم
  // مستقیم از همون درگاه انتخاب‌شده با merchant/amount سمت سرور چک می‌شه.
  const gateway = searchParams.get("gateway") === "zibal" ? "zibal" : "zarinpal";
  const planKey = searchParams.get("planKey");
  const duration = searchParams.get("duration") as Duration | null;
  const amount = Number(searchParams.get("amount"));
  const discountPercent = Number(searchParams.get("discountPercent") || 0);
  const referralUsageId = searchParams.get("referralUsageId") || undefined;
  const discountCodeId = searchParams.get("discountCodeId") || undefined;
  const upgradeFromSubId = searchParams.get("upgradeFromSubId") || undefined;

  if (!planKey || !duration || !DURATION_MONTHS[duration] || !amount) {
    return failRedirect("invalid_params", userId, planKey, duration);
  }

  let verified: { ok: boolean; refId?: string };
  try {
    if (gateway === "zibal") {
      const trackId = searchParams.get("trackId");
      const success = searchParams.get("success");
      if (!trackId || success !== "1") {
        return failRedirect("gateway_canceled_or_error", userId, planKey, duration);
      }
      const result = await zibalVerify(Number(trackId));
      // زیبال برخلاف زرین‌پال مبلغ رو به verify نمی‌گیره، فقط توی جواب برمی‌گردونه —
      // پس تطبیق مبلغ رو خودمون اینجا چک می‌کنیم (همون تضمین امنیتی زرین‌پال).
      verified = result.ok && result.amount === amount
        ? { ok: true, refId: String(result.refNumber ?? trackId) }
        : { ok: false };
    } else {
      const status = searchParams.get("Status");
      const authority = searchParams.get("Authority");
      if (status !== "OK" || !authority) {
        return failRedirect("gateway_canceled_or_error", userId, planKey, duration);
      }
      verified = await zarinpalVerifyPayment({ amountRial: amount, authority });
    }
  } catch {
    return failRedirect("verify_request_error", userId, planKey, duration);
  }
  if (!verified.ok) {
    return failRedirect("verify_rejected", userId, planKey, duration);
  }

  const plan = await prisma.plan.findUnique({
    where: { key_market: { key: planKey, market: "IRAN" } },
    include: { modules: true },
  });
  if (!plan) {
    return failRedirect("plan_not_found", userId, planKey, duration);
  }

  const months = DURATION_MONTHS[duration];
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + months);

  // ارتقا به مکس: سقف انقضا مستقلا از دیتابیس (نه از روی query که کاربر
  // می‌تونه توی URL بازگشت از درگاه دستکاری‌اش کنه) خونده می‌شه — where
  // شامل userId هم هست تا حتی با دستکاری id، کاربر فقط بتونه یکی از
  // اشتراک‌های خودش رو مبنا بگیره، نه یه اشتراک کاربر دیگه.
  if (upgradeFromSubId) {
    const sourceSub = await prisma.subscription.findFirst({ where: { id: upgradeFromSubId, userId }, select: { currentPeriodEnd: true } });
    if (sourceSub && sourceSub.currentPeriodEnd.getTime() < currentPeriodEnd.getTime()) {
      currentPeriodEnd.setTime(sourceSub.currentPeriodEnd.getTime());
    }
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      interval: duration === "12" ? "YEARLY" : "MONTHLY",
      currentPeriodEnd,
      discountPercent,
      appliedReferralUsageId: referralUsageId,
      payments: {
        create: {
          amount,
          currency: "IRR",
          provider: gateway,
          providerRef: verified.refId,
          paidAt: new Date(),
        },
      },
    },
  });

  // دسترسی ماژول‌های پلن — همون قاعده‌ی ثبت‌نام (BASIC_MODULES): هر ماژول
  // یک ردیف ModuleAccess با تاریخ انقضای پایان دوره‌ی اشتراک.
  await prisma.moduleAccess.deleteMany({ where: { userId, module: { in: plan.modules.map((m) => m.module) } } });
  await prisma.moduleAccess.createMany({
    data: plan.modules.map((m) => ({ userId, module: m.module, active: true, expiresAt: currentPeriodEnd })),
  });

  // شرط «اولین پرداخت موفق» برای کد رفرال محقق شد — وضعیت REWARDED می‌شه.
  // توجه: پاداش «یک ماه رایگان برای دعوت‌کننده» هنوز پیاده نشده (فاز بعدی)،
  // اینجا فقط رکورد استفاده‌ی موفق ثبت می‌شه.
  if (referralUsageId) {
    await prisma.referralUsage.update({
      where: { id: referralUsageId },
      data: { status: "REWARDED", rewardedAt: new Date() },
    }).catch(() => {});
  }

  // مصرف کد تخفیف عمومی (DiscountCode) فقط اینجا، بعد verify شدن واقعی
  // پرداخت، ثبت می‌شه — نه موقع پیش‌نمایش/اعمال توی چک‌اوت — تا سقف
  // maxUsesPerUser واقعا روی خریدهای موفق حساب بشه، نه تلاش‌های ناتمام.
  if (discountCodeId) {
    await prisma.discountCodeUsage.create({ data: { discountCodeId, userId } }).catch(() => {});
  }

  const okUrl = new URL("/subscription", siteUrl);
  okUrl.searchParams.set("checkout", "success");
  okUrl.searchParams.set("sub", subscription.id);
  return NextResponse.redirect(okUrl);
}
