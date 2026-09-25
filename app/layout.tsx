import type { Metadata, Viewport } from "next";
import { Vazirmatn, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavDrawer } from "@/components/NavDrawer";
import { BackgroundCanvasLoader } from "@/components/BackgroundCanvasLoader";
import { SvgFilters } from "@/components/SvgFilters";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { MotionTuner } from "@/components/MotionTuner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NotificationEngine } from "@/components/NotificationEngine";
import { PRELOAD_SCRIPT } from "@/lib/preload";
import { THEME_INIT_SCRIPT } from "@/lib/themeColor";
import { PERF_INIT_SCRIPT } from "@/lib/perfTier";
import { TAP_FEEDBACK_INIT_SCRIPT } from "@/lib/tapFeedback";
import { BRAND_FA, BRAND_EN, BRAND_CATEGORY_FA, BRAND_TITLE, BRAND_DESC, OG_BASE } from "@/lib/brand";
import { SITE_URL, organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd } from "@/lib/seo";
import { InlineBootstrap } from "@/components/InlineBootstrap";
import { PwaProvider } from "@/components/PwaProvider";

// وزن variable به‌جای ۵ فایل فونت جدا برای هر وزن — همون طیف وزن‌ها رو از یک
// فایل واحد می‌ده، حجم دانلود فونت رو به‌شدت کم می‌کنه (بزرگ‌ترین بخش payload).
const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: "variable",
  variable: "--font-vazir",
});

// وضیرمتن هرچند subset لاتین هم داره، ولی گلیف‌های لاتین خودش (طراحی‌شده
// برای هم‌وزنی با فارسی) به‌اندازه‌ی یه فونت لاتین اختصاصی خوش‌فرم نیست —
// برای متن/اعداد انگلیسی زشت به‌نظر می‌رسید. چون این فونت فقط subset لاتین
// رو داره، در استک فونت هر جا قبل از وضیرمتن بیاد، فقط برای کاراکترهای
// لاتین/اعداد لاتین انتخاب می‌شه — فارسی/عربی همچنان بدون تغییر به وضیرمتن
// سقوط می‌کنه (طبق درخواست صریح کاربر: هیچ فونت فارسی دیگه‌ای — از جمله
// فونت قبلی IBM Plex Sans Arabic با گوشه‌های تیزتر — نباید استفاده بشه).
const latin = Inter({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-latin",
});

// وریفیکیشن موتورهای جست‌وجو/نقشه — فقط وقتی env مقدار داره اضافه می‌شه؛
// خالی‌بودنش نباید یک متاتگ verification خالی/نامعتبر توی <head> بذاره.
const verification: Metadata["verification"] = {
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
  ...(process.env.YANDEX_VERIFICATION ? { yandex: process.env.YANDEX_VERIFICATION } : {}),
  ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND_TITLE,
    // صفحات داخلی با metadata خودشون این default رو override می‌کنن؛
    // اگه صفحه‌ای عمدا metadata نده (صفحات خصوصی که noindex هستن)، همین
    // fallback عمومی نشون داده می‌شه — قابل قبوله چون این صفحات ایندکس
    // نمی‌شن، فقط برای عنوان تب مرورگر لازمه.
    template: `%s | ${BRAND_FA}`,
  },
  description: BRAND_DESC,
  applicationName: BRAND_FA,
  category: "productivity",
  creator: BRAND_EN,
  publisher: BRAND_EN,
  authors: [{ name: BRAND_EN, url: SITE_URL }],
  // پیش‌فرض سراسری «ایندکس بشو» — صفحات خصوصی از طریق X-Robots-Tag توی
  // next.config.js (نه اینجا) noindex می‌شن، چون خیلیاشون کامپوننت
  // کلاینتی‌ان و نمی‌تونن این metadata رو override کنن.
  robots: { index: true, follow: true },
  ...(Object.keys(verification).length ? { verification } : {}),
  // کلمه‌کلیدی صریح لازم نیست (گوگل سال‌هاست meta keywords رو نادیده
  // می‌گیره)، ولی این‌ها سیگنال برند رو تقویت می‌کنن — پوشش همه‌ی بخش‌های
  // واقعی محصول، نه فقط روتین.
  keywords: [
    BRAND_FA, BRAND_EN, BRAND_CATEGORY_FA, `${BRAND_CATEGORY_FA} ${BRAND_FA}`,
    "برنامه روتین روزانه", "مدیریت عادت", "برنامه‌ریزی روزانه", "تقویم شمسی",
    "برنامه بدنسازی هوشمند", "کالری‌شمار فارسی", "ژورنال ترید", "ژورنال معاملاتی فارسی",
    "رودمپ یادگیری هوش مصنوعی", "اتصال متاتریدر", "تقویم اقتصادی فارکس",
  ],
  openGraph: {
    ...OG_BASE,
    url: SITE_URL,
    title: BRAND_TITLE,
    description: BRAND_DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TITLE,
    description: BRAND_DESC,
    images: ["/og.png"],
  },
  // سافاری آیفون display:"standalone" manifest.ts رو نمی‌خونه — «افزودن به
  // صفحه‌ی اصلی» فقط با همین متاتگ‌ها یه اپ واقعی standalone می‌سازه (بدون
  // نوار آدرس/دکمه‌های سافاری)؛ بدونش، حتی با مانیفست درست، توی iOS بازم
  // مثل یه تب معمولی سافاری بالا می‌اومد.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND_FA,
  },
};

// Organization + WebSite + SoftwareApplication — یک گراف واحد (با @id)
// که واقعا روی این پروژه صدق می‌کنه (یه اپ واقعی با برند مشخص)، بدون هیچ
// داده‌ی ساختگی (نه rating نه review). عمدا توی root layout (نه یه
// صفحه‌ی خاص) چون توصیف خود سایته، نه محتوای یک صفحه. توابعش از
// lib/seo.ts می‌آیند تا صفحه‌ی اصلی (که همین SoftwareApplication رو
// دوباره استفاده می‌کنه) با این گراف یکی بمونه، نه یک کپیِ واگرا.
const JSON_LD_GRAPH = [organizationJsonLd(), websiteJsonLd(), softwareApplicationJsonLd()];

// viewport-fit:cover لازمه تا سافاری صفحه رو زیر ناچ/نوار وضعیت هم بکشه؛
// بدونش، سافاری اون نواحی رو با یه نوار سیستمی توپر (معمولا سیاه) پر
// می‌کنه، نه رنگ پس‌زمینه‌ی خود اپ.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // بدونِ این، رفتارِ پیش‌فرضِ کروم/اندروید (resizes-visual) یعنی وقتی
  // کیبوردِ صفحه‌نمایش باز می‌شه فقط visual viewport کوچیک می‌شه، نه layout
  // viewport — و چون واحدهای CSS (vh, dvh, و مرجعِ position:fixed) همه رویِ
  // layout viewport حساب می‌شن، نه visual، مودال‌هایی مثلِ «مدیرِ برنامه»
  // که وسط‌چین و max-height:...dvh هستن هیچ‌وقت نمی‌فهمن کیبورد بازه —
  // نتیجه‌ش یه شکافِ خالیِ بزرگ بینِ کادرِ نوشتن و کیبورده (باگِ واقعیِ
  // گزارش‌شده). resizes-content یعنی layout viewport هم واقعا با کیبورد
  // کوچیک بشه، پس dvh و وسط‌چینیِ fixed هر دو خودشون رو درست حساب می‌کنن.
  // مرورگرهایی که این دایرکتیو رو نمی‌شناسن (سافاریِ قدیمی‌تر) بی‌صدا
  // نادیده‌ش می‌گیرن — بدونِ ریگرسیون.
  interactiveWidget: "resizes-content",
  // themeColor عمدا این‌جا نیست — کاملا توی lib/themeColor.ts توضیح داده
  // شده: وقتی نکست مالک این تگ بود، بعد هیدریت نسخه‌ی خودش رو دوباره تزریق
  // می‌کرد و صفحه با دو متای theme-color (یکی بیات) می‌موند.
};

// layout از قبل dynamic است (InlineBootstrap کوکی می‌خواند)، پس خواندن سشن
// این‌جا رندر تازه‌ای تحمیل نمی‌کند — ولی یک رفت‌وبرگشت کامل شبکه از هر
// لود صفحه کم می‌کند، چون SessionProvider دیگر خودش `/api/auth/session` را
// صدا نمی‌زند.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    // data-theme روی html هم هست (نه فقط body): پس‌زمینه‌ی خود <html> همونیه
    // که سافاری توی ناحیه‌ی امن (زیر ناچ / بالای نوار خانه) و موقع اورراسکرول
    // نشون می‌ده. suppressHydrationWarning روی هردو لازمه چون اسکریپت inline
    // ممکنه قبل از هیدریت عوضشون کرده باشه.
    <html
      lang="fa"
      dir="rtl"
      data-theme="dark"
      suppressHydrationWarning
      className={`${vazir.variable} ${latin.variable}`}
    >
      {/* suppressHydrationWarning لازمه چون اسکریپت بالا ممکنه data-theme رو
          قبل از این‌که React هیدریت کنه عوض کرده باشه — یعنی یه mismatch
          «قابل‌انتظار و بی‌خطر» با همون چیزی که سرور رندر کرده (همیشه dark) */}
      <body data-theme="dark" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_GRAPH) }}
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* تشخیص دستگاه ضعیف — باید قبل از اولین پینت اجرا شود، وگرنه
            همان دستگاه اول نسخه‌ی سنگین را رندر می‌کند. */}
        <script dangerouslySetInnerHTML={{ __html: PERF_INIT_SCRIPT }} />
        {/* بازخوردِ کلیک/لمس روی هر باکسِ قابل‌کلیک — چه با موس چه با دست */}
        <script dangerouslySetInnerHTML={{ __html: TAP_FEEDBACK_INIT_SCRIPT }} />
        {/* باید *قبل* از PRELOAD_SCRIPT بیاید — آن اسکریپت همین تگ را
            می‌خواند تا بفهمد لازم است داده را از شبکه بگیرد یا نه. */}
        <InlineBootstrap />
        {/* پیش‌درخواست داده‌های بحرانی — دلیلش کاملا توی lib/preload.ts نوشته شده.
            باید همین‌جا (اول body، سینکرون) بمونه تا قبل از دانلود باندل JS اجرا بشه. */}
        <script dangerouslySetInnerHTML={{ __html: PRELOAD_SCRIPT }} />
        <SvgFilters />
        <BackgroundCanvasLoader />
        <AuthSessionProvider session={session}>
          <ThemeProvider>
            <MotionTuner>
              <NavDrawer />
              <NotificationEngine />
              {/* ثبتِ سرویس‌ورکر (کشِ app shell) + پیشنهادِ نصبِ اپ */}
              <PwaProvider />
              <div className="wrap">{children}</div>
            </MotionTuner>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
