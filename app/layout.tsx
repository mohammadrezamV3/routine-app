import type { Metadata, Viewport } from "next";
import { Vazirmatn, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavDrawer } from "@/components/NavDrawer";
import { BackgroundCanvasLoader } from "@/components/BackgroundCanvasLoader";
import { SvgFilters } from "@/components/SvgFilters";
import { ConflictAlert } from "@/components/ConflictAlert";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { NotificationEngine } from "@/components/NotificationEngine";
import { PRELOAD_SCRIPT } from "@/lib/preload";

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

export const metadata: Metadata = {
  title: "Arion",
  description: "روتین، خواب، ترید، ورزش و رودمپ‌های شخصی — همه‌جا یکجا",
};

// viewport-fit:cover لازمه تا سافاری صفحه رو زیرِ ناچ/نوارِ وضعیت هم بکشه؛
// بدونش، سافاری اون نواحی رو با یه نوارِ سیستمیِ توپر (معمولاً سیاه) پر
// می‌کنه، نه رنگِ پس‌زمینه‌ی خودِ اپ. themeColor پیش‌فرض همون رنگِ تمِ تاریکه
// (همون چیزی که body همیشه سمتِ سرور باهاش رندر می‌شه)؛ سوییچِ لحظه‌ایش به
// رنگِ تمِ روشن با تغییرِ data-theme، هم توی اسکریپتِ inlineِ زیر و هم توی
// ThemeProvider انجام می‌شه (مستقیم روی خودِ <meta name="theme-color">).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0E1011",
};

// اسکریپتِ inline و مسدودکننده — قبل از هر پینتی روی body اجرا می‌شه (چون
// اولین فرزندِ body ئه و مرورگر اسکریپت‌های غیر async/defer رو همون لحظه‌ای
// که به‌شون می‌رسه سینکرون اجرا می‌کنه) و data-theme رو از روی کوکی درست
// می‌کنه. عمداً به‌جای خوندنِ کوکی سمت سرور (cookies() توی layout.tsx) این‌جوری
// انجام شده: cookies() کل اپ رو از static به dynamic تبدیل می‌کرد (رندر
// سمت سرور به‌ازای هر ریکوئست) که دقیقاً برخلافِ بهینه‌سازیِ سرعتِ لود بود؛
// این‌جوری هم فلاش از بین می‌ره هم static rendering دست‌نخورده می‌مونه.
const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);if(m){document.body.setAttribute("data-theme",m[1]);if(m[1]==="light"){var t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute("content","#F4E3C9");}}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${plexMono.variable} ${latin.variable}`}>
      {/* suppressHydrationWarning لازمه چون اسکریپتِ بالا ممکنه data-theme رو
          قبل از این‌که React هیدریت کنه عوض کرده باشه — یعنی یه mismatch
          «قابل‌انتظار و بی‌خطر» با همون چیزی که سرور رندر کرده (همیشه dark) */}
      <body data-theme="dark" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* پیش‌درخواستِ داده‌های بحرانی — دلیلش کاملاً توی lib/preload.ts نوشته شده.
            باید همین‌جا (اولِ body، سینکرون) بمونه تا قبل از دانلودِ باندلِ JS اجرا بشه. */}
        <script dangerouslySetInnerHTML={{ __html: PRELOAD_SCRIPT }} />
        <SvgFilters />
        <BackgroundCanvasLoader />
        <ConflictAlert />
        <AuthSessionProvider>
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
