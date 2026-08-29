import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { DURATIONS, Duration, findPlanPricing } from "@/lib/planPricing";
import { zarinpalRequestPayment } from "@/lib/zarinpal";
import { zibalRequest } from "@/lib/zibal";
import { resolveDiscountCode } from "@/lib/discountValidation";

const GATEWAYS = ["zarinpal", "zibal"] as const;
type Gateway = (typeof GATEWAYS)[number];

// POST /api/subscription/checkout → پلن+مدت+کدِتخفیفِ اختیاری رو می‌گیره،
// مبلغ رو از جدولِ قیمتِ سمتِ سرور (نه از ورودیِ کلاینت) حساب می‌کنه، و
// درخواستِ پرداخت رو به زرین‌پال می‌فرسته. فقط بازارِ ایران/ریال پشتیبانی
// می‌شه — درگاهِ بین‌المللی هنوز وصل نشده.
export async function POST(req: NextRequest) {
  // **کلِ** تابع داخلِ یک try واحد است — شاملِ خواندنِ سشن و ریت‌لیمیت، که
  // قبلاً بیرون بودند.
  //
  // چرا مهم است: هر خطایی که بیرونِ try رخ دهد (مثلاً `getServerSession` با
  // NEXTAUTH_SECRETِ غلط، یا خطای دیتابیس در کال‌بکِ سشن، یا جدولی که هنوز
  // migrate نشده) باعث می‌شود نکست یک صفحه‌ی **HTML** با کدِ ۵۰۰ برگرداند نه
  // JSON. کلاینت هم روی `res.json()` خطا می‌خورد و فقط پیامِ عمومیِ «مشکلی در
  // اتصال به سرور» را نشان می‌دهد — بدونِ هیچ سرنخی از دلیلِ واقعی.
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const ip = getClientIp(req.headers);
    if (!checkRateLimit(`sub-checkout:${userId}:${ip}`, 8, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
    }

    const body = await req.json();
    const { planKey, duration, discountCode, gateway: rawGateway } = body as {
      planKey: string; duration: Duration; discountCode?: string; gateway?: string;
    };
    const gateway: Gateway = GATEWAYS.includes(rawGateway as Gateway) ? (rawGateway as Gateway) : "zarinpal";

    if (!planKey || !DURATIONS.includes(duration)) {
      return NextResponse.json({ error: "پلن یا مدت انتخاب‌شده معتبر نیست" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { market: true, phone: true } });
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
      const resolution = await resolveDiscountCode(discountCode, userId, planKey);
      if (!resolution.ok) {
        // کدی وارد شده ولی نه توی هیچ‌کدوم از دو جدول معتبر بود — به‌جای
        // نادیده‌گرفتنِ بی‌صدا (که کاربر فکر می‌کنه تخفیف اعمال شده)، صریح خطا می‌دیم.
        return NextResponse.json({ error: resolution.error }, { status: 400 });
      }
      discountPercent = resolution.percent;
      discountApplied = true;
      if (resolution.source === "referral") {
        const usage = await prisma.referralUsage.create({
          data: { referralCodeId: resolution.referralCodeId, inviteeUserId: userId },
        });
        referralUsageId = usage.id;
      }
    }

    const baseAmount = pricing.amounts[duration];
    const finalAmount = discountPercent > 0 ? Math.round((baseAmount * (100 - discountPercent)) / 100) : baseAmount;

    const origin = req.nextUrl.origin;
    const callbackUrl = `${origin}/api/subscription/verify?gateway=${gateway}&planKey=${encodeURIComponent(planKey)}&duration=${duration}&amount=${finalAmount}&discountPercent=${discountPercent}${referralUsageId ? `&referralUsageId=${referralUsageId}` : ""}`;

    const description = `خرید ${pricing.nameFa} — ${duration} ماهه`;
    const { paymentUrl } = gateway === "zibal"
      ? await zibalRequest(finalAmount, callbackUrl, description)
      : await zarinpalRequestPayment({
          amountRial: finalAmount,
          description,
          callbackUrl,
          mobile: user.phone || undefined,
        });
    // پنل Owner › Funnel — «شروع خرید» فقط وقتی ثبت می‌شه که واقعاً درخواستِ
    // پرداخت به درگاه با موفقیت ساخته شده باشه (نه هر کلیکِ فرانت)
    prisma.analyticsEvent.create({ data: { userId, type: "checkout_start", meta: { planKey, duration, gateway } } }).catch(() => {});
    return NextResponse.json({ paymentUrl, discountApplied });
  } catch (e: any) {
    if (e?.message?.includes("MERCHANT_ID") || e?.message?.includes("MERCHANT_KEY")) {
      return NextResponse.json({ error: "درگاهِ پرداختِ انتخاب‌شده هنوز روی این سرور راه‌اندازی نشده — به‌زودی" }, { status: 502 });
    }
    // خطاهای دیتابیس (مثلاً P2021: جدول وجود نداره چون migration اجرا نشده)
    // کدِ مشخصی دارن که برای کاربر معنی نداره — پیامِ عمومی‌تر ولی هنوز JSON.
    if (e?.code?.startsWith?.("P")) {
      return NextResponse.json({ error: "خطای داخلی سرور — لطفاً بعداً دوباره امتحان کن" }, { status: 500 });
    }
    return NextResponse.json({ error: e?.message || "خطا در اتصال به درگاه پرداخت" }, { status: 502 });
  }
}
