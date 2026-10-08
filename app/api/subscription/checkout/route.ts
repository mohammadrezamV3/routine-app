import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { DURATIONS, Duration, findPlanPricing } from "@/lib/planPricing";
import { zarinpalRequestPayment } from "@/lib/zarinpal";
import { clampWalletApply } from "@/lib/wallet";
import { activatePaidSubscription } from "@/lib/subscriptionActivation";

// درصدِ تخفیفِ کدِ رفرال در چک‌اوت — پاداشِ «یک ماه رایگان برای هردو طرف»یِ
// خودِ سیستم رفرال (بعد از اولین پرداختِ موفق دعوت‌شونده) جدا و هنوز سمتِ
// این چک‌اوت پیاده نشده؛ اینجا فقط همون تخفیفِ لحظه‌ی خریدِ دعوت‌شونده‌ست.
const REFERRAL_DISCOUNT_PERCENT = 10;

// POST /api/subscription/checkout → پلن+مدت+کدِتخفیفِ اختیاری رو می‌گیره،
// مبلغ رو از جدولِ قیمتِ سمتِ سرور (نه از ورودیِ کلاینت) حساب می‌کنه، و
// درخواستِ پرداخت رو به زرین‌پال می‌فرسته. فقط بازارِ ایران/ریال پشتیبانی
// می‌شه — درگاهِ بین‌المللی هنوز وصل نشده.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  if (!checkRateLimit(`sub-checkout:${userId}:${ip}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json();
  const { planKey, duration, discountCode, useWalletCredit } = body as {
    planKey: string;
    duration: Duration;
    discountCode?: string;
    useWalletCredit?: boolean;
  };

  if (!planKey || !DURATIONS.includes(duration)) {
    return NextResponse.json({ error: "پلن یا مدت انتخاب‌شده معتبر نیست" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { market: true, phone: true, walletBalance: true } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (user.market !== "IRAN") {
    return NextResponse.json({ error: "درگاهِ پرداختِ بین‌المللی هنوز فعال نشده — به‌زودی" }, { status: 503 });
  }

  const pricing = findPlanPricing(planKey, false);
  if (!pricing || pricing.free || !pricing.amounts) {
    return NextResponse.json({ error: "این پلن قابل خرید نیست" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { key_market: { key: planKey, market: "IRAN" } } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "این پلن فعلاً در دسترس نیست" }, { status: 400 });
  }

  let discountPercent = 0;
  let referralUsageId: string | undefined;
  let discountApplied = false;
  if (discountCode?.trim()) {
    const code = await prisma.referralCode.findUnique({
      where: { code: discountCode.trim().toUpperCase() },
    });
    if (code && code.userId !== userId) {
      discountPercent = REFERRAL_DISCOUNT_PERCENT;
      discountApplied = true;
      const usage = await prisma.referralUsage.create({
        data: { referralCodeId: code.id, inviteeUserId: userId },
      });
      referralUsageId = usage.id;
    }
  }

  const baseAmount = pricing.amounts[duration];
  const finalAmount = discountPercent > 0 ? Math.round((baseAmount * (100 - discountPercent)) / 100) : baseAmount;

  // کیفِ اعتبار فقط اگه کاربر صریحاً خواسته باشه (useWalletCredit) اعمال می‌شه،
  // و هیچ‌وقت بیشتر از موجودیِ واقعی یا بیشتر از خودِ قیمت (clampWalletApply).
  const walletApplied = useWalletCredit ? clampWalletApply(user.walletBalance, user.walletBalance, finalAmount) : 0;
  const amountToCharge = finalAmount - walletApplied;

  // پنل Owner › Funnel — «شروع خرید» فقط وقتی ثبت می‌شه که واقعاً درخواستِ
  // پرداخت (یا فعال‌سازیِ کاملاً کیفی) با موفقیت انجام شده باشه (نه هر کلیکِ فرانت)
  const logCheckoutStart = () =>
    prisma.analyticsEvent.create({ data: { userId, type: "checkout_start", meta: { planKey, duration } } }).catch(() => {});

  if (amountToCharge === 0) {
    // کیفِ اعتبار به‌تنهایی کل قیمت رو پوشش داد — بدونِ تماس با زرین‌پال،
    // مستقیم فعال‌سازی. amountCharged صفره، پس پاداشِ رفرالی هم روی این
    // خرید حساب نمی‌شه (قاعده‌ی ضدتورم توی activatePaidSubscription).
    try {
      const result = await activatePaidSubscription({
        userId,
        planKey,
        duration,
        discountPercent,
        referralUsageId,
        amountCharged: 0,
        walletApplied,
        provider: "wallet",
      });
      logCheckoutStart();
      return NextResponse.json({
        paymentUrl: null,
        redirectUrl: `/subscription?checkout=success&sub=${result.subscriptionId}`,
        discountApplied,
      });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "خطا در فعال‌سازیِ اشتراک" }, { status: 500 });
    }
  }

  const origin = req.nextUrl.origin;
  const callbackUrl = `${origin}/api/subscription/verify?planKey=${encodeURIComponent(planKey)}&duration=${duration}&amount=${amountToCharge}&discountPercent=${discountPercent}${referralUsageId ? `&referralUsageId=${referralUsageId}` : ""}`;

  try {
    const { authority, paymentUrl } = await zarinpalRequestPayment({
      amountRial: amountToCharge,
      description: `خرید ${pricing.nameFa} — ${duration} ماهه`,
      callbackUrl,
      mobile: user.phone || undefined,
    });
    // مقدارِ کیفِ اعتبارِ این خرید رو سمتِ سرور نگه می‌داریم (نه در URL برگشتی
    // که قابلِ دستکاریِ کاربره) — verify با authority همین رکورد رو می‌خونه
    // و مصرف (حذف) می‌کنه. توضیحِ کامل روی مدلِ PendingCheckout در schema.prisma.
    if (walletApplied > 0) {
      await prisma.pendingCheckout.create({ data: { authority, userId, walletApplied } });
    }
    logCheckoutStart();
    return NextResponse.json({ paymentUrl, discountApplied });
  } catch (e: any) {
    // اگه ZARINPAL_MERCHANT_ID هنوز ست نشده (این محیط/قبل از دیپلوی نهایی)
    // پیام صادقانه بده، نه یه خطای خام ۵۰۰.
    const msg = e?.message?.includes("ZARINPAL_MERCHANT_ID")
      ? "درگاهِ پرداخت هنوز روی این سرور راه‌اندازی نشده — به‌زودی"
      : e?.message || "خطا در اتصال به درگاه پرداخت";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
