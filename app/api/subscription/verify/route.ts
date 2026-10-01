import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const planKey = searchParams.get("planKey");
  const duration = searchParams.get("duration") as Duration | null;
  const amount = Number(searchParams.get("amount"));
  const discountPercent = Number(searchParams.get("discountPercent") || 0);
  const referralUsageId = searchParams.get("referralUsageId") || undefined;
  const discountCodeId = searchParams.get("discountCodeId") || undefined;
  const inviterRewardId = searchParams.get("inviterRewardId") || undefined;
  const upgradeFromSubId = searchParams.get("upgradeFromSubId") || undefined;

  if (!planKey || !duration || !DURATION_MONTHS[duration] || !amount) {
    return failRedirect("invalid_params", userId, planKey, duration);
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
          provider: "zibal",
          providerRef: verified.refId,
          paidAt: new Date(),
        },
      },
    },
  });

  // دسترسی ماژول‌های پلن: هر ماژول پلن (از جمله «روتین من» — دیگه رایگان
  // نیست) یک ردیف ModuleAccess با انقضای پایان دوره. اگه ردیف فعلی دیرتر
  // منقضی می‌شد (مثلا از خرید پلن بلندتری) همون حفظ می‌شه — خرید پلن
  // کوتاه‌تر هیچ‌وقت دسترسی باقی‌مونده رو کوتاه نمی‌کنه.
  const planModules = plan.modules.map((m) => m.module);
  const existing = await prisma.moduleAccess.findMany({
    where: { userId, module: { in: planModules } },
    select: { module: true, active: true, expiresAt: true },
  });
  const keepUntil = new Map(existing.filter((r) => r.active).map((r) => [r.module, r.expiresAt]));
  await prisma.moduleAccess.deleteMany({ where: { userId, module: { in: planModules } } });
  await prisma.moduleAccess.createMany({
    data: planModules.map((module) => {
      const prev = keepUntil.get(module);
      const expiresAt = prev === null ? null : prev && prev > currentPeriodEnd ? prev : currentPeriodEnd;
      return { userId, module, active: true, expiresAt };
    }),
  });

  // شرط «اولین پرداخت موفق» برای کد رفرال محقق شد — وضعیت REWARDED می‌شه و
  // از همین لحظه صاحب کد یک پاداش ۱۵٪ برای خرید بعدی خودش داره (lib/referral.ts).
  // where شامل inviteeUserId هست تا id دستکاری‌شده‌ی query مال کاربر دیگه‌ای نباشه.
  if (referralUsageId) {
    await prisma.referralUsage.updateMany({
      where: { id: referralUsageId, inviteeUserId: userId, status: "PENDING" },
      data: { status: "REWARDED", rewardedAt: new Date() },
    }).catch(() => {});
  }

  // مصرف پاداش دعوت صاحب کد — فقط پاداشی که واقعا مال همین کاربره و هنوز مصرف نشده
  if (inviterRewardId) {
    await prisma.referralUsage.updateMany({
      where: { id: inviterRewardId, status: "REWARDED", inviterRewardApplied: false, referralCode: { userId } },
      data: { inviterRewardApplied: true },
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
