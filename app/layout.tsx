import type { Metadata, Viewport } from "next";
import { Vazirmatn, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
// تم رنگی سراسری (data-palette: ترید/ورزش/پالت‌های آماده) — هسته‌ی مشترک، بعد از globals و قبل از تم نوآر ادمین
import "./palette-themes.css";
import "@/components/ltr-shell.css";
import "@/components/ltr-routine.css";
import "@/components/ltr-trade.css";
import "@/components/ltr-mentor.css";
import "@/components/ltr-review.css";
import "@/components/ltr-admin.css";
import "@/components/ltr-public.css";
import "./admin-theme.css";
// لایه‌ی تایپوگرافی فقط انگلیسی (html[lang="en"]) — فارسی را تغییر نمی‌دهد
import "./en-type.css";
// سیستم حرکت (توکن‌ها، ابزارها، ورود صفحه/بخش) — بعد از globals تا در اسپسیفیسیتی برابر برنده باشه
import "./motion.css";
import { EventThemeCssPreview } from "@/components/EventThemeCssPreview";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PaletteProvider } from "@/components/PaletteProvider";
import { NavDrawer } from "@/components/NavDrawer";
import { BackgroundCanvasLoader } from "@/components/BackgroundCanvasLoader";
import { SvgFilters } from "@/components/SvgFilters";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { MotionTuner } from "@/components/MotionTuner";
import { getSessionFast } from "@/lib/serverSession";
import { PRELOAD_SCRIPT } from "@/lib/preload";
import { THEME_INIT_SCRIPT, THEME_COOKIE, themeColorFor } from "@/lib/themeColor";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PERF_INIT_SCRIPT } from "@/lib/perfTier";
import { ADMIN_THEME_INIT_SCRIPT } from "@/lib/adminTheme";
import { TAP_FEEDBACK_INIT_SCRIPT } from "@/lib/tapFeedback";
import { brandName, BRAND_FA, BRAND_EN, BRAND_CATEGORY_FA, BRAND_TITLE, BRAND_DESC, OG_BASE } from "@/lib/brand";
import { SITE_URL, organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd, siteNavigationJsonLd } from "@/lib/seo";
import { PUBLIC_PAGES } from "@/lib/llmsContent";
import { InlineBootstrap } from "@/components/InlineBootstrap";
import { InlineMeta } from "@/components/InlineMeta";
import { PwaProvider } from "@/components/PwaProvider";
import LangSync from "@/components/LangSync";
import { InviteRefCapture } from "@/components/InviteRefCapture";
import { PopupExitAnimator } from "@/components/PopupExitAnimator";
import { MotionRuntime } from "@/components/MotionRuntime";
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
import { SectionProvider } from "@/components/SectionProvider";
import { getRequestPath, getSection } from "@/lib/sectionServer";
import { HEADER_DESKTOP_MEDIA, HEADER_MOBILE_MEDIA, sectionIconSm, sectionWordmarkSm } from "@/lib/sectionAssets";
import {
  PALETTE_COOKIE, PALETTE_CUSTOM_COOKIE, customPaletteCss, isPaletteSetting, normalizeHex, paletteMetaColors, resolvePalette,
  type PaletteSetting,
} from "@/lib/palette";

// پیش‌نمایش تم مناسبتی فقط روی دستگاه ادمین: شناسه = اعمال همون تم، "none" = بدون تم.
// قبل از اولین پینت اجرا می‌شه و تم زنده‌ی سرور رو فقط روی همین دستگاه override می‌کنه.
const EVENT_PREVIEW_SCRIPT = `try{var v=localStorage.getItem(${JSON.stringify(EVENT_PREVIEW_KEY)});if(v){var h=document.documentElement;if(v==="none")h.removeAttribute("data-event-theme");else if(/^[a-z0-9-]+$/.test(v))h.setAttribute("data-event-theme",v)}}catch(e){}`;

// وزن variable به‌جای ۵ فایل فونت جدا برای هر وزن — همون طیف وزن‌ها رو از یک
// فایل واحد می‌ده، حجم دانلود فونت رو به‌شدت کم می‌کنه (بزرگ‌ترین بخش payload).
// فقط subset عربی/فارسی: همه‌ی استک‌های فونت سایت `var(--font-latin), var(--font-vazir)` ـن، پس حروف
// لاتین و اعداد همیشه با Inter رسم می‌شن و subset لاتین وزیرمتن (۳۴KB، preload‌شده روی هر صفحه)
// هیچ‌وقت استفاده نمی‌شد. display:swap: متن همون لحظه با فونت جایگزین دیده می‌شه، نه نامرئی تا رسیدن
// فونت (block روی موبایل کند تا ۳ ثانیه متن رو پنهان نگه می‌داشت و FCP/LCP رو عقب می‌انداخت).
const vazir = Vazirmatn({
  subsets: ["arabic"],
  weight: "variable",
  variable: "--font-vazir",
  display: "swap",
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
  display: "swap",
  // پیش‌فرض next/font یک فونت جایگزین با src:local(Arial) می‌سازه که *همه‌ی* کاراکترها رو
  // ادعا می‌کنه؛ روی آیفون Arial وجود داره و متن فارسی به‌جای وزیرمتن با Arial (فونت
  // دستگاه) رسم می‌شد — دقیقا باگ «فونت PWA به فونت گوشی بستگی داره».
  adjustFontFallback: false,
});

// فونت انگلیسی Figtree، فایل محلی woff2 فقط ساب‌ست لاتین، ~20KB (فقط وقتی زبان انگلیسیه روی html فعال می‌شه: app/en-type.css →
// html[lang="en"]{--font-latin:...}). فارسی همچنان Inter می‌گیره و چون هیچ المانی در حالت فارسی
// این family رو استفاده نمی‌کنه، فایل woff2 اش اصلا دانلود نمی‌شه. preload:false چون preload در
// next/font برای همه‌ی صفحه‌ها (از جمله فارسی) تگ می‌ذاره. adjustFontFallback:false چون
// فال‌بک خودکار next همه‌ی کاراکترها (از جمله فارسی) رو ادعا می‌کنه؛ فال‌بک محدود به لاتین با همون
// اعداد در en-type.css تعریف شده. Figtree: گرد و هندسی، هم‌خوان با دکمه‌ها و کارت‌های گرد سایت، اعداد
// دقیقا وسط خط (offset صفر) و در اندازه‌های ریز خوانا.
const enLatin = localFont({
  src: "./fonts/Figtree-latin-var.woff2",
  // بازه‌ی وزن اعلام‌شده تا 760: وزن 800 و 900 که برای وزیرمتن نوشته شدن، روی Figtree سنگین
  // دیده می‌شدن؛ مرورگر درخواست بالاتر رو به همین سقف می‌رسونه (بدون دست‌زدن به صدها قاعده).
  weight: "300 760",
  style: "normal",
  variable: "--font-latin-en",
  display: "swap",
  preload: false,
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
type InitialAppearance = {
  theme: "dark" | "light";
  fromAccount: boolean;
  paletteSetting: PaletteSetting;
  paletteCustom: string | null;
};

async function resolveInitialAppearance(userId: string | undefined): Promise<InitialAppearance> {
  const jar = cookies();
  const cookieTheme = jar.get(THEME_COOKIE)?.value;
  // تم رنگی: کوکی مشترک (مهمان و کاربری که هنوز چیزی روی حساب نذاشته)، حساب اگه مقدار داشت مرجعه
  const cookiePalette = jar.get(PALETTE_COOKIE)?.value;
  let paletteSetting: PaletteSetting = isPaletteSetting(cookiePalette) ? cookiePalette : "auto";
  let paletteCustom = normalizeHex(jar.get(PALETTE_CUSTOM_COOKIE)?.value);
  let accountTheme: "dark" | "light" | null = null;
  if (userId) {
    try {
      // یک کوئری برای هر سه کلید (روی ایندکس یکتای userId+key)
      const rows = await prisma.userSetting.findMany({
        where: { userId, key: { in: ["theme", "palette", "paletteCustom"] } },
        select: { key: true, value: true },
      });
      for (const row of rows) {
        if (row.key === "theme" && (row.value === "light" || row.value === "dark")) accountTheme = row.value;
        else if (row.key === "palette" && isPaletteSetting(row.value)) paletteSetting = row.value;
        else if (row.key === "paletteCustom") paletteCustom = normalizeHex(row.value) ?? paletteCustom;
      }
    } catch {
      // دیتابیس در دسترس نبود — همان کوکی‌ها
    }
  }
  return {
    theme: accountTheme ?? (cookieTheme === "light" ? "light" : "dark"),
    fromAccount: accountTheme !== null,
    paletteSetting,
    paletteCustom,
  };
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
  const [{ theme, fromAccount, paletteSetting, paletteCustom }, eventThemeId] = await Promise.all([
    resolveInitialAppearance((session?.user as { id?: string } | undefined)?.id),
    getActiveEventThemeId().catch((): string | null => null),
  ]);
  const locale = getLocale();
  // بخش موثر (کوکی، میزبان، وگرنه روتین)؛ همیشه یکی از routine/trade/workout — lib/sections.ts
  const section = getSection();
  // پالت موثر (تنظیم کاربر یا پالت بخش): از اولین بایت HTML روی <html data-palette> — بدون فلش.
  // پالت سفارشی: CSS فقط از هگز اعتبارسنجی‌شده ساخته می‌شه (lib/palette.ts)، رشته‌ی کاربر وارد نمی‌شه.
  const palette = resolvePalette(paletteSetting, paletteCustom, section);
  const customCss = palette === "custom" ? customPaletteCss(paletteCustom) : "";
  const customMeta = palette === "custom" ? paletteMetaColors(paletteCustom) : null;
  // لوگوی هدر (components/NavDrawer.tsx) از اولین پینت: preload دقیقا همون تصویرهای هدر برای بخش و تم جاری،
  // با همان media نقطه‌ی شکست CSS (فقط یکی از دو تصویر دانلود می‌شه). هدر روی /auth و /admin نیست. نشان A
  // با پالت صریح غیر روتین جاش .logo-tint می‌آد (CSS)، پس اون‌جا preload نمی‌شه.
  const reqPath = getRequestPath() ?? "";
  const headerLogoShown = !(reqPath.startsWith("/auth") || reqPath.startsWith("/admin"));
  const iconTinted = paletteSetting !== "auto" && palette !== "routine";
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
      data-section={section ?? undefined}
      data-palette={palette}
      data-palette-set={paletteSetting !== "auto" ? "1" : undefined}
      data-palette-meta={customMeta ? `${customMeta.dark},${customMeta.light}` : undefined}
      suppressHydrationWarning
      className={`${vazir.variable} ${latin.variable}${locale === "en" ? ` ${enLatin.variable}` : ""}`}
    >
      <head>
        {/* نوار وضعیت اندروید از همون اولین پینت هم‌رنگ تم — نه بعد از
            اجرای اسکریپت. مالک این تگ هنوز خود اپه (نه metadata نکست؛
            دلیلش lib/themeColor.ts)، پس دوباره‌تزریق نمی‌شه و
            syncThemeColorMeta همین یکی رو آپدیت می‌کنه. */}
        <meta name="theme-color" content={themeColorFor(theme, section, !!eventThemeId, palette, customMeta)} />
        {headerLogoShown && (
          <>
            {!iconTinted && <link rel="preload" as="image" href={sectionIconSm(section)} media={HEADER_MOBILE_MEDIA} fetchPriority="high" />}
            <link rel="preload" as="image" href={sectionWordmarkSm(theme)} media={HEADER_DESKTOP_MEDIA} fetchPriority="high" />
          </>
        )}
        {customCss && <style id="arion-palette-custom" dangerouslySetInnerHTML={{ __html: customCss }} />}
        <script dangerouslySetInnerHTML={{ __html: EVENT_PREVIEW_SCRIPT }} />
        {/* تم آزمایشی ادمین (lib/adminTheme.ts) — قبل از اولین پینت */}
        <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_INIT_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning لازمه چون اسکریپت بالا ممکنه data-theme رو
          قبل از این‌که React هیدریت کنه عوض کرده باشه — یعنی یه mismatch
          «قابل‌انتظار و بی‌خطر» با همون چیزی که سرور رندر کرده (مثلا وقتی
          ThemeProvider بعدا تم ذخیره‌شده‌ی حساب رو اعمال می‌کنه) */}
      <body data-theme={theme} suppressHydrationWarning>
        <EventThemeCssPreview serverActive={!!eventThemeId} />
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
        {/* قابلیت‌ها + نوار تعمیر داخل HTML — بدون دو درخواست بعد از هیدریت (lib/inlineMeta.ts) */}
        <InlineMeta />
        {/* پیش‌درخواست داده‌های بحرانی — دلیلش کاملا توی lib/preload.ts نوشته شده.
            باید همین‌جا (اول body، سینکرون) بمونه تا قبل از دانلود باندل JS اجرا بشه. */}
        <script dangerouslySetInnerHTML={{ __html: PRELOAD_SCRIPT }} />
        <SvgFilters />
        <BackgroundCanvasLoader />
        {/* خودترمیمی لود CSS/چانک بعد از شکست شبکه یا دیپلوی جدید — lib/assetRecovery.ts */}
        <AssetRecovery />
        {/* خروج نرم همه‌ی پاپ‌آپ‌ها — lib/popupExit.ts */}
        <PopupExitAnimator />
        {/* ورود نرم محتوای تازه‌رسیده + ظاهرشدن با اسکرول در صفحه‌های عمومی — app/motion.css */}
        <MotionRuntime />
        {/* نور هاور دور همه‌ی باکس‌ها — lib/boxHover.ts */}
        <BoxHoverTracker />
        <I18nProvider locale={locale}>
        <SectionProvider section={section}>
        <AuthSessionProvider session={session}>
          <PaletteProvider initialSetting={paletteSetting} initialCustom={paletteCustom}>
          <ThemeProvider initialTheme={theme}>
            <MotionTuner>
              {/* نوار تعمیر (lib/maintenance.ts) — وقتی خاموشه چیزی رندر نمی‌کنه */}
              <MaintenanceBanner />
              <NavDrawer />
              {/* ثبت سرویس‌ورکر (کش app shell) + پیشنهاد نصب اپ */}
              <PwaProvider />
              {/* زبان کاربر واردشده یک بار روی حساب ذخیره می‌شه تا اعلان‌ها به زبان خودش برن — lib/i18nServer.ts */}
              <LangSync />
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
          </PaletteProvider>
        </AuthSessionProvider>
        </SectionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
