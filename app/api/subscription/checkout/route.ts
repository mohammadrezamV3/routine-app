import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { DURATIONS, Duration, chargeAmountRial, durationMonths, findPlanPricing } from "@/lib/planPricing";
import { getPricingConfig } from "@/lib/planPricingServer";
import { signCheckoutParams } from "@/lib/checkoutSignature";
import { zibalRequest } from "@/lib/zibal";
import { getSiteUrl } from "@/lib/siteUrl";
import { resolveDiscountCode } from "@/lib/discountValidation";
import { findAchievementReward } from "@/lib/achievementsServer";
import { isMonthlyOption, pickBestDiscount } from "@/lib/achievementRewards";
import { findUpgradeSource, computeUpgradePricing, UPGRADE_TARGET_PLAN_KEY } from "@/lib/planUpgrade";
import { clampWalletApply } from "@/lib/wallet";
import { activateSubscription } from "@/lib/subscriptionActivation";

// زرین‌پال طبق درخواست صریح کامل از پروژه حذف شد — زیبال تنها درگاهه.
const GATEWAYS = ["zibal"] as const;
type Gateway = (typeof GATEWAYS)[number];

// POST /api/subscription/checkout → پلن+مدت+کدتخفیف اختیاری رو می‌گیره،
// مبلغ رو از جدول قیمت سمت سرور (نه از ورودی کلاینت) حساب می‌کنه، و
// درخواست پرداخت رو به زیبال می‌فرسته. فقط بازار ایران/ریال پشتیبانی
// می‌شه — درگاه بین‌المللی هنوز وصل نشده.
export async function POST(req: NextRequest) {
  // **کل** تابع داخل یک try واحد است — شامل خواندن سشن و ریت‌لیمیت، که
  // قبلا بیرون بودند.
  //
  // چرا مهم است: هر خطایی که بیرون try رخ دهد (مثلا `getServerSession` با
  // NEXTAUTH_SECRET غلط، یا خطای دیتابیس در کال‌بک سشن، یا جدولی که هنوز
  // migrate نشده) باعث می‌شود نکست یک صفحه‌ی **HTML** با کد ۵۰۰ برگرداند نه
  // JSON. کلاینت هم روی `res.json()` خطا می‌خورد و فقط پیام عمومی «مشکلی در
  // اتصال به سرور» را نشان می‌دهد — بدون هیچ سرنخی از دلیل واقعی.
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const ip = getClientIp(req.headers);
    if (!(await checkRateLimit(`sub-checkout:${userId}:${ip}`, 8, 10 * 60 * 1000))) {
      return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
    }

    const body = await req.json();
    const { planKey, duration, discountCode, gateway: rawGateway, useWalletCredit } = body as {
      planKey: string; duration: Duration; discountCode?: string; gateway?: string; useWalletCredit?: boolean;
    };
    const gateway: Gateway = GATEWAYS.includes(rawGateway as Gateway) ? (rawGateway as Gateway) : "zibal";

    if (!planKey || !DURATIONS.includes(duration)) {
      return NextResponse.json({ error: "پلن یا مدت انتخاب‌شده معتبر نیست" }, { status: 400 });
    }

    // نسخه‌ی بین‌المللی طبق درخواست صریح کامل حذف شد؛ همه‌ی کاربرها بازار
    // ایران‌اند، پس دیگر چک market لازم نیست.
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, walletBalance: true } });
    if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

    // قیمت و تعداد ماه از پیکربندی پنل ادمین (/admin/pricing)، تازه از دیتابیس
    // (نه کش) تا تغییر Owner فورا روی هر خرید جدید اعمال بشه.
    const pricingConfig = await getPricingConfig({ fresh: true });
    const pricing = findPlanPricing(planKey, pricingConfig);
    if (!pricing) {
      return NextResponse.json({ error: "این پلن قابل خرید نیست" }, { status: 400 });
    }
    const listAmount = chargeAmountRial(pricingConfig, planKey, duration);
    if (listAmount == null) {
      return NextResponse.json({ error: "این مدت فعلا برای خرید فعال نیست" }, { status: 400 });
    }
    const months = durationMonths(pricingConfig, duration);

    const plan = await prisma.plan.findUnique({ where: { key_market: { key: planKey, market: "IRAN" } } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "این پلن فعلا در دسترس نیست" }, { status: 400 });
    }

    let discountPercent = 0;
    let referralUsageId: string | undefined;
    let discountCodeId: string | undefined;
    let achievementRewardId: string | undefined;
    let discountApplied = false;
    let resolution: Awaited<ReturnType<typeof resolveDiscountCode>> | null = null;
    if (discountCode?.trim()) {
      resolution = await resolveDiscountCode(discountCode, userId, planKey);
      if (!resolution.ok) {
        // کدی وارد شده ولی نه توی هیچ‌کدوم از دو جدول معتبر بود — به‌جای
        // نادیده‌گرفتن بی‌صدا (که کاربر فکر می‌کنه تخفیف اعمال شده)، صریح خطا می‌دیم.
        return NextResponse.json({ error: resolution.error }, { status: 400 });
      }
    }
    // پاداش اچیومنت‌ها (lib/achievementRewards.ts، فقط گزینه‌ی یک‌ماهه) خودکار
    // اعمال می‌شه؛ با کد تخفیف جمع نمی‌شه — بیشترین درصد برنده‌ست و اونی که
    // استفاده نشد مصرف هم نمی‌شه. پاداشِ دعوت دیگه تخفیف نیست — اعتبار کیفه
    // که بعد از خریدِ موفقِ *این* کاربر به صاحبِ کد واریز می‌شه (lib/wallet.ts).
    const achReward = isMonthlyOption(months) ? await findAchievementReward(userId) : null;
    const best = pickBestDiscount([
      { source: "code", percent: resolution?.ok ? resolution.percent : 0 },
      { source: "achievement", percent: achReward?.percent ?? 0 },
    ]);
    if (best?.source === "achievement" && achReward) {
      discountPercent = achReward.percent;
      achievementRewardId = achReward.id;
      discountApplied = true;
    } else if (resolution?.ok) {
      discountPercent = resolution.percent;
      discountApplied = true;
      if (resolution.source === "referral") {
        const usage = await prisma.referralUsage.create({
          data: { referralCodeId: resolution.referralCodeId, inviteeUserId: userId },
        });
        referralUsageId = usage.id;
      } else {
        discountCodeId = resolution.discountCodeId;
      }
    }

    // ارتقا به مکس: اگه کاربر از قبل ورزش/ترید فعال داره، قیمت پایه‌ی مکس
    // با اعتبار همون پلن کم می‌شه — قبل از اینکه درصد کد تخفیف (اگه بود)
    // روی همین قیمت کاهش‌یافته اعمال بشه. upgradeFromSubId هم به verify
    // منتقل می‌شه تا اونجا خودش مستقلا (نه از روی همین درخواست) تاریخ
    // واقعی انقضای پلن فعلی رو از دیتابیس بخونه و سقف مدت رو حساب کنه —
    // امنیتش این‌جوری تضمین می‌شه، نه با اعتماد به یه تاریخ توی query.
    let upgradeFromSubId: string | undefined;
    let baseAmount = listAmount;
    if (planKey === UPGRADE_TARGET_PLAN_KEY) {
      const upgradeSource = await findUpgradeSource(userId);
      if (upgradeSource) {
        const { amount } = computeUpgradePricing(baseAmount, upgradeSource, months);
        baseAmount = amount;
        upgradeFromSubId = upgradeSource.subscriptionId;
      }
    }
    const finalAmount = discountPercent > 0 ? Math.round((baseAmount * (100 - discountPercent)) / 100) : baseAmount;

    // کیفِ اعتبار فقط اگه کاربر صریحاً خواسته باشه (useWalletCredit) اعمال می‌شه،
    // و هیچ‌وقت بیشتر از موجودیِ واقعی یا بیشتر از خودِ قیمت (clampWalletApply).
    const walletApplied = useWalletCredit ? clampWalletApply(user.walletBalance, user.walletBalance, finalAmount) : 0;
    const amountToCharge = finalAmount - walletApplied;

    if (amountToCharge === 0) {
      // کیفِ اعتبار به‌تنهایی کل قیمت رو پوشش داد — بدونِ تماس با درگاه،
      // مستقیم فعال‌سازی. amountCharged صفره، پس پاداشِ رفرالی هم روی این
      // خرید حساب نمی‌شه (قاعده‌ی ضدتورم توی lib/subscriptionActivation.ts).
      const result = await activateSubscription({
        userId,
        planKey,
        months,
        discountPercent,
        referralUsageId,
        discountCodeId,
        achievementRewardId,
        upgradeFromSubId,
        amountCharged: 0,
        walletApplied,
        provider: "wallet",
      });
      prisma.analyticsEvent.create({ data: { userId, type: "checkout_start", meta: { planKey, duration, gateway: "wallet" } } }).catch(() => {});
      return NextResponse.json({
        paymentUrl: null,
        redirectUrl: `/subscription?checkout=success&sub=${result.subscriptionId}`,
        discountApplied,
      });
    }

    // از NEXTAUTH_URL ساخته می‌شود، نه از origin درخواست — دلیل کامل در
    // lib/siteUrl.ts. خلاصه‌اش: پشت nginx، origin می‌تواند http یا
    // localhost دربیاید و زیبال آدرس بازگشت نامعتبر را با کد ۱۰۶ رد می‌کند.
    const origin = getSiteUrl(req.nextUrl.origin);
    // پلن/مدت/ماه/مبلغ/مبلغِ کیف با HMAC امضا می‌شن (lib/checkoutSignature.ts)
    // تا verify به هیچ پارامتر دستکاری‌شده‌ای از URL بازگشت اعتماد نکنه.
    const sig = signCheckoutParams({ userId, planKey, duration, months, amount: amountToCharge, discountPercent, referralUsageId, discountCodeId, upgradeFromSubId, achievementRewardId, walletApplied });
    const callbackUrl = `${origin}/api/subscription/verify?gateway=${gateway}&planKey=${encodeURIComponent(planKey)}&duration=${duration}&months=${months}&amount=${amountToCharge}&discountPercent=${discountPercent}${referralUsageId ? `&referralUsageId=${referralUsageId}` : ""}${discountCodeId ? `&discountCodeId=${discountCodeId}` : ""}${upgradeFromSubId ? `&upgradeFromSubId=${upgradeFromSubId}` : ""}${achievementRewardId ? `&achievementRewardId=${achievementRewardId}` : ""}${walletApplied ? `&walletApplied=${walletApplied}` : ""}&sig=${sig}`;

    const description = `خرید ${pricing.nameFa} — ${months} ماهه`;
    const { paymentUrl } = await zibalRequest(amountToCharge, callbackUrl, description);
    // پنل Owner › Funnel — «شروع خرید» فقط وقتی ثبت می‌شه که واقعا درخواست
    // پرداخت به درگاه با موفقیت ساخته شده باشه (نه هر کلیک فرانت)
    prisma.analyticsEvent.create({ data: { userId, type: "checkout_start", meta: { planKey, duration, gateway } } }).catch(() => {});
    return NextResponse.json({ paymentUrl, discountApplied });
  } catch (e: any) {
    if (e?.message?.includes("MERCHANT_ID") || e?.message?.includes("MERCHANT_KEY")) {
      return NextResponse.json({ error: "درگاه پرداخت انتخاب‌شده هنوز روی این سرور راه‌اندازی نشده — به‌زودی" }, { status: 502 });
    }
    // خطاهای دیتابیس (مثلا P2021: جدول وجود نداره چون migration اجرا نشده)
    // کد مشخصی دارن که برای کاربر معنی نداره — پیام عمومی‌تر ولی هنوز JSON.
    if (e?.code?.startsWith?.("P")) {
      return NextResponse.json({ error: "خطای داخلی سرور — لطفا بعدا دوباره امتحان کن" }, { status: 500 });
    }
    return NextResponse.json({ error: e?.message || "خطا در اتصال به درگاه پرداخت" }, { status: 502 });
  }
}
