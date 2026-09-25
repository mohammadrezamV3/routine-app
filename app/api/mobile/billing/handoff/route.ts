import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getSiteUrl } from "@/lib/siteUrl";
import { redeemCheckoutToken } from "@/lib/mobileBilling";
import { createCheckoutWebSession } from "@/lib/mobileBillingWebSession";

export const dynamic = "force-dynamic";

// GET /api/mobile/billing/handoff?t=<token> — **مرورگرِ سیستم** (Custom Tab)
// بازش می‌کنه، نه WebView ِ اپ. هیچ Bearer‌ای نمی‌گیره؛ تنها اعتبار همون
// توکنِ تصادفیِ ۳۲ بایتیه که:
//   • فقط SHA-256ش در دیتابیسه،
//   • حداکثر ۱۰ دقیقه عمر داره،
//   • با updateMany ِ اتمیک دقیقا یک‌بار مصرف می‌شه (رفرش/اشتراک‌گذاریِ لینک → بی‌اثر).
// بعد از مصرف: نشستِ وبِ ۳۰ دقیقه‌ای (lib/mobileBillingWebSession.ts) و
// ریدایرکت به همون صفحه‌ی چک‌اوتِ وب. پرداخت و برگشتِ درگاه (verify) کاملا
// همون مسیرِ وبه و تنها جاییه که ماژول اعطا می‌شه.
export async function GET(req: NextRequest) {
  const siteUrl = getSiteUrl(req.nextUrl.origin);
  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(`mobile-billing-handoff:${ip}`, 30, 10 * 60 * 1000))) {
    return failPage(429);
  }

  const redeemed = await redeemCheckoutToken(req.nextUrl.searchParams.get("t"));
  if (!redeemed) return failPage(410);

  const session = await createCheckoutWebSession(redeemed.userId, { ip: ip === "direct" ? null : ip, userAgent: req.headers.get("user-agent") });
  if (!session) return failPage(410);

  const target = new URL("/subscription/checkout", siteUrl);
  target.searchParams.set("plan", redeemed.planKey);
  target.searchParams.set("duration", redeemed.duration);
  const res = NextResponse.redirect(target, 303);
  res.cookies.set(session.cookieName, session.value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: session.secure,
    maxAge: session.maxAge,
  });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

/** صفحه‌ی سادهِ بدونِ اسکریپت — لینکِ منقضی/مصرف‌شده. هیچ جزئیاتی (مثلا «مصرف‌شده» در برابرِ «منقضی») لو نمی‌ره. */
function failPage(status: number) {
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>آریون</title>
<style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center;line-height:1.9}</style></head>
<body><main><h1 style="font-size:18px">این لینکِ پرداخت دیگر معتبر نیست</h1>
<p style="font-size:14px">لینک‌های پرداختِ اپ فقط یک‌بار و حداکثر ۱۰ دقیقه کار می‌کنند. به اپ آریون برگرد و دوباره «خرید» را بزن.</p>
<p><a href="arion://payment-result?status=expired">بازگشت به اپ</a></p></main></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
