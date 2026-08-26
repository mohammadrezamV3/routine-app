import type { Metadata, Viewport } from "next";
import { Vazirmatn, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavDrawer } from "@/components/NavDrawer";
import { BackgroundCanvasLoader } from "@/components/BackgroundCanvasLoader";
import { SvgFilters } from "@/components/SvgFilters";
import { ConflictAlert } from "@/components/ConflictAlert";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NotificationEngine } from "@/components/NotificationEngine";
import { PRELOAD_SCRIPT } from "@/lib/preload";
import { THEME_INIT_SCRIPT } from "@/lib/themeColor";
import { InlineBootstrap } from "@/components/InlineBootstrap";

// وزن variable به‌جای ۵ فایل فونت جدا برای هر وزن — همون طیف وزن‌ها رو از یک
// فایل واحد می‌ده، حجم دانلود فونت رو به‌شدت کم می‌کنه (بزرگ‌ترین بخش payload).
const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: "variable",
  variable: "--font-vazir",
});

// جایگزین IBM Plex Mono شد چون آن فونت گلیف فارسی/اعداد فارسی نداشت و برای
// اعداد فارسی (faNum) و تاریخ‌های فارسی داخل عناصر .mono، بی‌صدا به فونت
// mono پیش‌فرض سیستم سقوط می‌کرد؛ این فونت همون حس تکنیکال خانواده Plex رو
// حفظ می‌کنه ولی فارسی/عربی رو هم درست پوشش می‌ده.
// preload:false عمدیه. next/font به‌صورت پیش‌فرض برای *هر* وزن و *هر* subset
// یک <link rel="preload"> با بالاترین اولویت می‌ذاره — این فونت با ۳ وزن و ۲
// subset تنهایی ۶ تا از ۹ پری‌لودِ صفحه (و بیشترِ ~۲۵۰KB فونت) رو می‌گرفت و
// با خودِ CSS/JSِ بحرانی سرِ پهنای‌باند رقابت می‌کرد. در حالی که این فونت توی
// همه‌ی استک‌های globals.css جایگاهِ *دوم* داره (var(--font-latin) اول میاد)،
// یعنی فقط برای گلیف‌های فارسی/عربیِ عناصرِ .mono لازم می‌شه — نه چیزی که
// باید قبل از اولین پینت دانلود شده باشه. با این تنظیم فونت همچنان دقیقاً
// همون‌جاها استفاده می‌شه، فقط با اولویتِ عادی و بدونِ کند کردنِ رندرِ اول.
const plexMono = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plexmono",
  display: "swap",
  preload: false,
});

// وضیرمتن/پلکس هرچند subset لاتین هم دارن، ولی گلیف‌های لاتینِ خودشون
// (طراحی‌شده برای هم‌وزنی با فارسی) به‌اندازه‌ی یه فونتِ لاتینِ اختصاصی
// خوش‌فرم نیستن — برای متن/اعدادِ انگلیسی زشت به‌نظر می‌رسیدن. چون این فونت
// (برخلافِ دوتای بالا) فقط subsetِ لاتین رو داره، در استکِ فونت هر جا قبل از
// وضیرمتن/پلکس بیاد، فقط برای کاراکترهای لاتین/اعدادِ لاتین انتخاب می‌شه —
// فارسی/عربی همچنان بدونِ تغییر به وضیرمتن/پلکس سقوط می‌کنه.
const latin = Inter({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-latin",
});

// آدرس پایه‌ی production — برای resolve کردنِ URLهای نسبی توی OG/canonical
// (metadataBase) و برای ساختنِ لینک‌های مطلق توی robots.ts/sitemap.ts.
// از env می‌خونیم چون دامنه هاردکد نباید بشه؛ fallback فقط برای وقتیه که
// env ست نشده (dev/build محلی).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://arionapp.ir";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Arion — روتین، ورزش، تغذیه و ترید در یک اپ",
    // صفحاتِ داخلی با metadata خودشون این default رو override می‌کنن؛
    // اگه صفحه‌ای عمداً metadata نده (صفحاتِ خصوصی که noindex هستن)، همین
    // fallback عمومی نشون داده می‌شه — قابل قبوله چون این صفحات ایندکس
    // نمی‌شن، فقط برای عنوانِ تبِ مرورگر لازمه.
    template: "%s | Arion",
  },
  description: "روتین، خواب، ترید، ورزش و رودمپ‌های شخصی — همه‌جا یکجا",
  applicationName: "Arion",
  // پیش‌فرضِ سراسری «ایندکس بشو» — صفحاتِ خصوصی از طریق X-Robots-Tag توی
  // next.config.js (نه اینجا) noindex می‌شن، چون خیلیاشون کامپوننتِ
  // کلاینتی‌ان و نمی‌تونن این metadata رو override کنن.
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: SITE_URL,
    siteName: "Arion",
    title: "Arion — روتین، ورزش، تغذیه و ترید در یک اپ",
    description: "روتین، خواب، ترید، ورزش و رودمپ‌های شخصی — همه‌جا یکجا",
  },
  twitter: {
    card: "summary",
    title: "Arion — روتین، ورزش، تغذیه و ترید در یک اپ",
    description: "روتین، خواب، ترید، ورزش و رودمپ‌های شخصی — همه‌جا یکجا",
  },
  // سافاریِ آیفون display:"standalone"ِ manifest.ts رو نمی‌خونه — «افزودن به
  // صفحه‌ی اصلی» فقط با همین متاتگ‌ها یه اپِ واقعیِ standalone می‌سازه (بدونِ
  // نوارِ آدرس/دکمه‌های سافاری)؛ بدونش، حتی با مانیفستِ درست، توی iOS بازم
  // مثلِ یه تبِ معمولیِ سافاری بالا می‌اومد.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Arion",
  },
};

// Organization + WebSite — دو schema پایه‌ای که واقعاً روی این پروژه صدق
// می‌کنن (یه اپ واقعی با برند مشخص)، بدونِ هیچ داده‌ی ساختگی (نه rating نه
// review نه قیمتِ اینجا). عمداً توی root layout (نه یه صفحه‌ی خاص) چون
// توصیفِ خودِ سایته، نه محتوای یک صفحه.
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Arion",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Arion",
  url: SITE_URL,
  inLanguage: "fa-IR",
};

// viewport-fit:cover لازمه تا سافاری صفحه رو زیرِ ناچ/نوارِ وضعیت هم بکشه؛
// بدونش، سافاری اون نواحی رو با یه نوارِ سیستمیِ توپر (معمولاً سیاه) پر
// می‌کنه، نه رنگِ پس‌زمینه‌ی خودِ اپ.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // themeColor عمداً این‌جا نیست — کاملاً توی lib/themeColor.ts توضیح داده
  // شده: وقتی نکست مالکِ این تگ بود، بعدِ هیدریت نسخه‌ی خودش رو دوباره تزریق
  // می‌کرد و صفحه با دو متای theme-color (یکی بیات) می‌موند.
};

// layout از قبل dynamic است (InlineBootstrap کوکی می‌خواند)، پس خواندنِ سشن
// این‌جا رندرِ تازه‌ای تحمیل نمی‌کند — ولی یک رفت‌وبرگشتِ کاملِ شبکه از هر
// لودِ صفحه کم می‌کند، چون SessionProvider دیگر خودش `/api/auth/session` را
// صدا نمی‌زند.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    // data-theme روی html هم هست (نه فقط body): پس‌زمینه‌ی خودِ <html> همونیه
    // که سافاری توی ناحیه‌ی امن (زیرِ ناچ / بالای نوارِ خانه) و موقعِ اورراسکرول
    // نشون می‌ده. suppressHydrationWarning روی هردو لازمه چون اسکریپتِ inline
    // ممکنه قبل از هیدریت عوضشون کرده باشه.
    <html
      lang="fa"
      dir="rtl"
      data-theme="dark"
      suppressHydrationWarning
      className={`${vazir.variable} ${plexMono.variable} ${latin.variable}`}
    >
      {/* suppressHydrationWarning لازمه چون اسکریپتِ بالا ممکنه data-theme رو
          قبل از این‌که React هیدریت کنه عوض کرده باشه — یعنی یه mismatch
          «قابل‌انتظار و بی‌خطر» با همون چیزی که سرور رندر کرده (همیشه dark) */}
      <body data-theme="dark" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([ORGANIZATION_JSON_LD, WEBSITE_JSON_LD]) }}
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* باید *قبل* از PRELOAD_SCRIPT بیاید — آن اسکریپت همین تگ را
            می‌خواند تا بفهمد لازم است داده را از شبکه بگیرد یا نه. */}
        <InlineBootstrap />
        {/* پیش‌درخواستِ داده‌های بحرانی — دلیلش کاملاً توی lib/preload.ts نوشته شده.
            باید همین‌جا (اولِ body، سینکرون) بمونه تا قبل از دانلودِ باندلِ JS اجرا بشه. */}
        <script dangerouslySetInnerHTML={{ __html: PRELOAD_SCRIPT }} />
        <SvgFilters />
        <BackgroundCanvasLoader />
        <ConflictAlert />
        <AuthSessionProvider session={session}>
          <ThemeProvider>
            <NavDrawer />
            <NotificationEngine />
            <div className="wrap">{children}</div>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
