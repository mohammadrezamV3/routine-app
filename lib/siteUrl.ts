// آدرسِ پایه‌ی سایت، برای وقتی که سرور باید یک URLِ مطلق **بسازد** (نه فقط
// نمایش بدهد) — مثلاً آدرسِ بازگشتی که به درگاه پرداخت داده می‌شود.
//
// چرا `req.nextUrl.origin` کافی نیست: اپ پشتِ nginx اجرا می‌شود. آن‌چه به
// پروسه‌ی Node می‌رسد یک درخواستِ ساده‌ی HTTP روی ۱۲۷.۰.۰.۱:۳۰۰۰ است، پس
// `origin` می‌تواند `http://arionapp.ir` (بدونِ s) یا حتی
// `http://127.0.0.1:3000` دربیاید — بسته به این‌که کدام هدرها فوروارد شده
// باشند.
//
// درگاه‌های پرداختِ ایرانی آدرسِ بازگشت را **اعتبارسنجی می‌کنند** (زیبال با
// کدِ ۱۰۶ ردش می‌کند). یعنی یک originِ اشتباه، پرداخت را از همان اولین قدم
// می‌شکند — بدونِ این‌که ربطی به کلیدِ مرچنت یا شبکه داشته باشد.
//
// ترتیبِ منابع عمدی است:
//  ۱. NEXTAUTH_URL — روی هر دیپلویِ سالمی حتماً ست است و حتماً درست است،
//     وگرنه خودِ ورود به حساب کار نمی‌کرد. مطمئن‌ترین منبع.
//  ۲. NEXT_PUBLIC_SITE_URL — اگر جدا ست شده باشد.
//  ۳. originِ درخواست — فقط به‌عنوان آخرین چاره.
// آدرس‌هایی که هرگز نباید به کاربر داده شوند: اپ داخلِ کانتینر روی
// 0.0.0.0:3000 گوش می‌دهد، پس `req.nextUrl.origin` معمولاً همین است. اگر
// همین را به مرورگرِ کاربر بدهیم، روی گوشیِ خودش به هیچ‌جا می‌رود —
// **صفحه‌ی سفیدِ گزارش‌شده با `0.0.0.0:3000`** دقیقاً همین بود.
function isPublicHost(u: string): boolean {
  try {
    const h = new URL(u).hostname;
    if (h === "localhost" || h === "0.0.0.0" || h === "::1") return false;
    if (/^127\./.test(h)) return false;
    // شبکه‌های خصوصی (کانتینر/شبکه‌ی داخلیِ داکر)
    if (/^10\./.test(h) || /^192\.168\./.test(h)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}

const FALLBACK_SITE_URL = "https://arionapp.ir";

export function getSiteUrl(fallbackOrigin?: string): string {
  // اولین گزینه‌ای که هم مقدار دارد هم **آدرسِ عمومیِ واقعی** است.
  //
  // چرا فیلترِ isPublicHost لازم است: قبلاً اگر NEXTAUTH_URL ست نبود، این
  // تابع به originِ درخواست برمی‌گشت — یعنی همان `0.0.0.0:3000` — و فیکس
  // عملاً بی‌اثر می‌شد. حالا حتی روی سروری که هیچ‌کدام از این env‌ها ست
  // نشده‌اند، آدرسِ دامنه‌ی واقعی برگردانده می‌شود.
  for (const candidate of [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_SITE_URL, fallbackOrigin]) {
    if (!candidate) continue;
    const normalized = candidate.replace(/\/+$/, "").replace(/^http:\/\//, "https://");
    if (isPublicHost(normalized)) return normalized;
  }
  return FALLBACK_SITE_URL;
}
