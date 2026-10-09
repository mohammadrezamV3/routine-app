import type { Metadata, Viewport } from "next";
import { Vazirmatn, Inter } from "next/font/google";
import "./globals.css";
import "./event-themes.css";
import "./admin-theme.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavDrawer } from "@/components/NavDrawer";
import { BackgroundCanvasLoader } from "@/components/BackgroundCanvasLoader";
import { SvgFilters } from "@/components/SvgFilters";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { MotionTuner } from "@/components/MotionTuner";
import { getSessionFast } from "@/lib/serverSession";
import { PRELOAD_SCRIPT } from "@/lib/preload";
import { THEME_INIT_SCRIPT, THEME_COLORS, THEME_COOKIE } from "@/lib/themeColor";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PERF_INIT_SCRIPT } from "@/lib/perfTier";
import { ADMIN_THEME_INIT_SCRIPT } from "@/lib/adminTheme";
import { TAP_FEEDBACK_INIT_SCRIPT } from "@/lib/tapFeedback";
import { brandName, BRAND_FA, BRAND_EN, BRAND_CATEGORY_FA, BRAND_TITLE, BRAND_DESC, OG_BASE } from "@/lib/brand";
import { SITE_URL, organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd, siteNavigationJsonLd } from "@/lib/seo";
import { PUBLIC_PAGES } from "@/lib/llmsContent";
import { InlineBootstrap } from "@/components/InlineBootstrap";
import { PwaProvider } from "@/components/PwaProvider";
import { InviteRefCapture } from "@/components/InviteRefCapture";
import { PopupExitAnimator } from "@/components/PopupExitAnimator";
import { BoxHoverTracker } from "@/components/BoxHoverTracker";
import { RouteProgress } from "@/components/RouteProgress";
import { Suspense } from "react";
import { BootSplash } from "@/components/BootSplash";
import { BootSplashRelease } from "@/components/BootSplashRelease";
import { AssetRecovery } from "@/components/AssetRecovery";
import { DeferredEffects } from "@/components/DeferredEffects";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { getActiveEventThemeId } from "@/lib/eventThemeServer";
import { EVENT_PREVIEW_KEY } from "@/lib/eventThemeState";
import { getLocale } from "@/lib/i18nServer";
import { dirOf, isEn } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18nProvider";

// پیش‌نمایش تم مناسبتی فقط روی دستگاه ادمین: شناسه = اعمال همون تم، "none" = بدون تم.
// قبل از اولین پینت اجرا می‌شه و تم زنده‌ی سرور رو فقط روی همین دستگاه override می‌کنه.
const EVENT_PREVIEW_SCRIPT = `try{var v=localStorage.getItem(${JSON.stringify(EVENT_PREVIEW_KEY)});if(v){var h=document.documentElement;if(v==="none")h.removeAttribute("data-event-theme");else if(/^[a-z0-9-]+$/.test(v))h.setAttribute("data-event-theme",v)}}catch(e){}`;

// وزن variable به‌جای ۵ فایل فونت جدا برای هر وزن — همون طیف وزن‌ها رو از یک
// فایل واحد می‌ده، حجم دانلود فونت رو به‌شدت کم می‌کنه (بزرگ‌ترین بخش payload).
const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: "variable",
  variable: "--font-vazir",
  display: "block",
  adjustFontFallback: false,
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
  display: "block",
  // پیش‌فرض next/font یک فونت جایگزین با src:local(Arial) می‌سازه که *همه‌ی* کاراکترها رو
  // ادعا می‌کنه؛ روی آیفون Arial وجود داره و متن فارسی به‌جای وزیرمتن با Arial (فونت
  // دستگاه) رسم می‌شد — دقیقا باگ «فونت PWA به فونت گوشی بستگی داره».
  adjustFontFallback: false,
});

// وریفیکیشن موتورهای جست‌وجو/نقشه — فقط وقتی env مقدار داره اضافه می‌شه؛
// خالی‌بودنش نباید یک متاتگ verification خالی/نامعتبر توی <head> بذاره.
const verification: NonNullable<Metadata["verification"]> = {
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
  ...(process.env.YANDEX_VERIFICATION ? { yandex: process.env.YANDEX_VERIFICATION } : {}),
  ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
};

const EN_TITLE = `${BRAND_EN} | Daily planner, workout, calorie tracker and trading journal`;
const EN_DESC =
  `${BRAND_EN} is an app for managing everyday life: daily and weekly routine, habit and task tracking, ` +
  `AI-assisted workout plans, calorie counting, and a trading journal, all under one account.`;

export function generateMetadata(): Metadata {
  // انگلیسی: عنوان/توضیح/کلمات کلیدی انگلیسی؛ فارسی دقیقا همون قبلی
  const en = isEn();
  const title = en ? EN_TITLE : BRAND_TITLE;
  const desc = en ? EN_DESC : BRAND_DESC;
  return {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    // صفحات داخلی با metadata خودشون این default رو override می‌کنن؛
    // اگه صفحه‌ای عمدا metadata نده (صفحات خصوصی که noindex هستن)، همین
    // fallback عمومی نشون داده می‌شه — قابل قبوله چون این صفحات ایندکس
    // نمی‌شن، فقط برای عنوان تب مرورگر لازمه.
    template: `%s | ${brandName()}`,
  },
  description: desc,
  applicationName: brandName(),
  category: "productivity",
  creator: BRAND_EN,
  publisher: BRAND_EN,
  authors: [{ name: BRAND_EN, url: SITE_URL }],
  // پیش‌فرض سراسری «ایندکس بشو» — صفحات خصوصی از طریق X-Robots-Tag توی
  // next.config.js (نه اینجا) noindex می‌شن، چون خیلیاشون کامپوننت
  // کلاینتی‌ان و نمی‌تونن این metadata رو override کنن.
  robots: { index: true, follow: true },
  // فید RSS بلاگ سراسری اعلام می‌شه (نه فقط توی /blog) تا فیدخوان‌ها/
  // خزنده‌ها از هر صفحه‌ای پیداش کنن — <link rel="alternate" type=
  // "application/rss+xml"> توی <head> میاد.
  alternates: { types: { "application/rss+xml": `${SITE_URL}/blog/feed.xml` } },
  ...(Object.keys(verification).length ? { verification } : {}),
  // کلمه‌کلیدی صریح لازم نیست (گوگل سال‌هاست meta keywords رو نادیده
  // می‌گیره)، ولی این‌ها سیگنال برند رو تقویت می‌کنن — پوشش همه‌ی بخش‌های
  // واقعی محصول، نه فقط روتین.
  keywords: en
    ? [
        BRAND_EN, "daily routine planner", "habit tracker", "Jalali calendar planner",
        "AI workout plan", "calorie tracker", "trading journal", "MetaTrader sync", "forex economic calendar",
      ]
    : [
        BRAND_FA, BRAND_EN, BRAND_CATEGORY_FA, `${BRAND_CATEGORY_FA} ${BRAND_FA}`,
        "برنامه روتین روزانه", "مدیریت عادت", "برنامه‌ریزی روزانه", "تقویم شمسی",
        "برنامه بدنسازی هوشمند", "کالری‌شمار فارسی", "ژورنال ترید", "ژورنال معاملاتی فارسی",
        "رودمپ یادگیری هوش مصنوعی", "اتصال متاتریدر", "تقویم اقتصادی فارکس",
      ],
  // images این‌جا هم عمدا حذف شده — همون دلیل توضیح زیر twitter؛
  // app/opengraph-image.tsx تصویر ریشه رو خودکار تزریق می‌کنه.
  openGraph: {
    ...OG_BASE,
    ...(en ? { locale: "en_US", siteName: BRAND_EN } : {}),
    images: undefined,
    url: SITE_URL,
    title,
    description: desc,
  },
  // images عمدا این‌جا هاردکد نیست: نکست به‌صورت خودکار opengraph-image.tsx
  // خود هر مسیر رو (یا در نبودش، همین app/opengraph-image.tsx ریشه رو)
  // به‌عنوان تصویر توییتر/OG تزریق می‌کنه — ولی *فقط* اگه اینجا صراحتا
  // images ست نشده باشه. قبلا همین یک خط باعث می‌شد هر صفحه‌ای که خودش
  // twitter تعریف نمی‌کرد (faq، about، …) به‌جای تصویر اختصاصی‌اش همیشه
  // /og.png عمومی رو نشون بده.
  twitter: {
    card: "summary_large_image",
    title,
    description: desc,
  },
  // سافاری آیفون display:"standalone" manifest.ts رو نمی‌خونه — «افزودن به
  // صفحه‌ی اصلی» فقط با همین متاتگ‌ها یه اپ واقعی standalone می‌سازه (بدون
  // نوار آدرس/دکمه‌های سافاری)؛ بدونش، حتی با مانیفست درست، توی iOS بازم
  // مثل یه تب معمولی سافاری بالا می‌اومد.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: brandName(),
  },
};
}

// Organization + WebSite + SoftwareApplication — یک گراف واحد (با @id)
// که واقعا روی این پروژه صدق می‌کنه (یه اپ واقعی با برند مشخص)، بدون هیچ
// داده‌ی ساختگی (نه rating نه review). عمدا توی root layout (نه یه
// صفحه‌ی خاص) چون توصیف خود سایته، نه محتوای یک صفحه. توابعش از
// lib/seo.ts می‌آیند تا صفحه‌ی اصلی (که همین SoftwareApplication رو
// دوباره استفاده می‌کنه) با این گراف یکی بمونه، نه یک کپی واگرا.
const JSON_LD_GRAPH = [
  organizationJsonLd(),
  websiteJsonLd(),
  softwareApplicationJsonLd(),
  siteNavigationJsonLd(PUBLIC_PAGES),
];

// viewport-fit:cover لازمه تا سافاری صفحه رو زیر ناچ/نوار وضعیت هم بکشه؛
// بدونش، سافاری اون نواحی رو با یه نوار سیستمی توپر (معمولا سیاه) پر
// می‌کنه، نه رنگ پس‌زمینه‌ی خود اپ.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // بدون این، رفتار پیش‌فرض کروم/اندروید (resizes-visual) یعنی وقتی
  // کیبورد صفحه‌نمایش باز می‌شه فقط visual viewport کوچیک می‌شه، نه layout
  // viewport — و چون واحدهای CSS (vh, dvh, و مرجع position:fixed) همه روی
  // layout viewport حساب می‌شن، نه visual، مودال‌هایی مثل «مدیر برنامه»
  // که وسط‌چین و max-height:...dvh هستن هیچ‌وقت نمی‌فهمن کیبورد بازه —
  // نتیجه‌ش یه شکاف خالی بزرگ بین کادر نوشتن و کیبورده (باگ واقعی
  // گزارش‌شده). resizes-content یعنی layout viewport هم واقعا با کیبورد
  // کوچیک بشه، پس dvh و وسط‌چینی fixed هر دو خودشون رو درست حساب می‌کنن.
  // مرورگرهایی که این دایرکتیو رو نمی‌شناسن (سافاری قدیمی‌تر) بی‌صدا
  // نادیده‌ش می‌گیرن — بدون ریگرسیون.
  interactiveWidget: "resizes-content",
  // themeColor عمدا این‌جا نیست — کاملا توی lib/themeColor.ts توضیح داده
  // شده: وقتی نکست مالک این تگ بود، بعد هیدریت نسخه‌ی خودش رو دوباره تزریق
  // می‌کرد و صفحه با دو متای theme-color (یکی بیات) می‌موند.
};

// layout از قبل dynamic است (InlineBootstrap کوکی می‌خواند)، پس خواندن سشن
// این‌جا رندر تازه‌ای تحمیل نمی‌کند — ولی یک رفت‌وبرگشت کامل شبکه از هر
// لود صفحه کم می‌کند، چون SessionProvider دیگر خودش `/api/auth/session` را
// صدا نمی‌زند.
async function resolveInitialTheme(userId: string | undefined): Promise<{ theme: "dark" | "light"; fromAccount: boolean }> {
  const cookieTheme = cookies().get(THEME_COOKIE)?.value;
  if (userId) {
    try {
      const row = await prisma.userSetting.findUnique({
        where: { userId_key: { userId, key: "theme" } },
        select: { value: true },
      });
      if (row?.value === "light" || row?.value === "dark") return { theme: row.value, fromAccount: true };
    } catch {
      // دیتابیس در دسترس نبود — همان کوکی
    }
  }
  return { theme: cookieTheme === "light" ? "light" : "dark", fromAccount: false };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFast();
  // تم از همون اولین بایت HTML درسته، نه بعد از اجرای اسکریپت inline.
  // قبلا سرور همیشه data-theme="dark" می‌فرستاد و اسکریپت بعدا (روی کوکی)
  // عوضش می‌کرد؛ ولی اگه مرورگر قبل از اون اسکریپت حتی یک بار استایل رو
  // حساب کرده بود (پارسر استریمینگ، یا هر پینت زودرس روی اندروید)، body با
  // تم تاریک رسم می‌شد و `transition:background .3s` روی body اون رو در
  // چند فریم به کرمی «فید» می‌کرد — همون «هر بار اول یه بک‌گراند دیگه
  // می‌بینم». اندازه‌گیری‌شده: در تم روشن ۳ فریم اول اسکرین‌کست تیره
  // (#0E1011) بودن. layout از قبل dynamic است (InlineBootstrap و سشن
  // کوکی می‌خونن)، پس خوندن این کوکی هزینه‌ی رندر اضافه‌ای نداره.
  //
  // برای کاربر لاگین‌کرده، تم *حساب* (UserSetting "theme") مرجع است نه
  // کوکی این دستگاه: کوکی می‌تواند با حساب ناهماهنگ باشد (تم روی دستگاه
  // دیگری عوض شده، کوکی پاک/منقضی شده، اپ نصب‌شده) و در آن حالت صفحه اول با
  // تم کوکی رسم می‌شد و بعد از رسیدن تم حساب (ThemeProvider) با فید
  // `transition:background` به تم دیگر می‌رفت — اندازه‌گیری‌شده روی کاربر
  // آزمایشی با کوکی dark و تم حساب light. یک findUnique روی کلید یکتای
  // (userId, key)؛ فقط برای کاربر لاگین‌کرده.
  // تم مناسبتی زنده برای همه — از همون اولین بایت HTML (بدون فلش)؛ موازی با تم حساب
  const [{ theme, fromAccount }, eventThemeId] = await Promise.all([
    resolveInitialTheme((session?.user as { id?: string } | undefined)?.id),
    getActiveEventThemeId().catch((): string | null => null),
  ]);
  const locale = getLocale();
  return (
    // data-theme روی html هم هست (نه فقط body): پس‌زمینه‌ی خود <html> همونیه
    // که سافاری توی ناحیه‌ی امن (زیر ناچ / بالای نوار خانه) و موقع اورراسکرول
    // نشون می‌ده. suppressHydrationWarning روی هردو لازمه چون اسکریپت inline
    // ممکنه قبل از هیدریت عوضشون کرده باشه.
    <html
      lang={locale}
      dir={dirOf(locale)}
      data-theme={theme}
      // «account» = تم از حساب آمده و اسکریپت inline نباید با کوکی بازنویسی‌اش
      // کند (برعکس: کوکی را با آن هم‌گام می‌کند) — lib/themeColor.ts
      data-theme-src={fromAccount ? "account" : undefined}
      data-event-theme={eventThemeId ?? undefined}
      suppressHydrationWarning
      className={`${vazir.variable} ${latin.variable}`}
    >
      <head>
        {/* نوار وضعیت اندروید از همون اولین پینت هم‌رنگ تم — نه بعد از
            اجرای اسکریپت. مالک این تگ هنوز خود اپه (نه metadata نکست؛
            دلیلش lib/themeColor.ts)، پس دوباره‌تزریق نمی‌شه و
            syncThemeColorMeta همین یکی رو آپدیت می‌کنه. */}
        <meta name="theme-color" content={THEME_COLORS[theme]} />
        <script dangerouslySetInnerHTML={{ __html: EVENT_PREVIEW_SCRIPT }} />
        {/* تم آزمایشی ادمین (lib/adminTheme.ts) — قبل از اولین پینت */}
        <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_INIT_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning لازمه چون اسکریپت بالا ممکنه data-theme رو
          قبل از این‌که React هیدریت کنه عوض کرده باشه — یعنی یه mismatch
          «قابل‌انتظار و بی‌خطر» با همون چیزی که سرور رندر کرده (مثلا وقتی
          ThemeProvider بعدا تم ذخیره‌شده‌ی حساب رو اعمال می‌کنه) */}
      <body data-theme={theme} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_GRAPH) }}
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* تشخیص دستگاه ضعیف — باید قبل از اولین پینت اجرا شود، وگرنه
            همان دستگاه اول نسخه‌ی سنگین را رندر می‌کند. */}
        <script dangerouslySetInnerHTML={{ __html: PERF_INIT_SCRIPT }} />
        {/* اسپلش ورود — بعد از اسکریپت‌های تم/دستگاه تا از اولین پینت رنگ و
            ردیف درست رو داشته باشه، و قبل از بقیه تا زودتر از هر چیزی دیده بشه */}
        <BootSplash />
        {/* بازخورد کلیک/لمس روی هر باکس قابل‌کلیک — چه با موس چه با دست */}
        <script dangerouslySetInnerHTML={{ __html: TAP_FEEDBACK_INIT_SCRIPT }} />
        {/* باید *قبل* از PRELOAD_SCRIPT بیاید — آن اسکریپت همین تگ را
            می‌خواند تا بفهمد لازم است داده را از شبکه بگیرد یا نه. */}
        <InlineBootstrap />
        {/* پیش‌درخواست داده‌های بحرانی — دلیلش کاملا توی lib/preload.ts نوشته شده.
            باید همین‌جا (اول body، سینکرون) بمونه تا قبل از دانلود باندل JS اجرا بشه. */}
        <script dangerouslySetInnerHTML={{ __html: PRELOAD_SCRIPT }} />
        <SvgFilters />
        <BackgroundCanvasLoader />
        {/* خودترمیمی لود CSS/چانک بعد از شکست شبکه یا دیپلوی جدید — lib/assetRecovery.ts */}
        <AssetRecovery />
        {/* خروج نرم همه‌ی پاپ‌آپ‌ها — lib/popupExit.ts */}
        <PopupExitAnimator />
        {/* نور هاور دور همه‌ی باکس‌ها — lib/boxHover.ts */}
        <BoxHoverTracker />
        <I18nProvider locale={locale}>
        <AuthSessionProvider session={session}>
          <ThemeProvider initialTheme={theme}>
            <MotionTuner>
              {/* نوار تعمیر (lib/maintenance.ts) — وقتی خاموشه چیزی رندر نمی‌کنه */}
              <MaintenanceBanner />
              <NavDrawer />
              {/* ثبت سرویس‌ورکر (کش app shell) + پیشنهاد نصب اپ */}
              <PwaProvider />
              {/* لینک دعوت دوست (?ref=) — lib/invite.ts */}
              <InviteRefCapture />
              {/* یادآور + realtime + اطلاعیه + تبریک مناسبت — بعد از اولین پینت، در زمان بیکاری */}
              <DeferredEffects />
              {/* Suspense: RouteProgress از useSearchParams استفاده می‌کنه و بدون مرز، رندر
                  استاتیک همه‌ی صفحه‌ها رو به کلاینت می‌کشوند */}
              <Suspense fallback={null}><RouteProgress /></Suspense>
              <div className="wrap">{children}</div>
              <BootSplashRelease />
            </MotionTuner>
          </ThemeProvider>
        </AuthSessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
