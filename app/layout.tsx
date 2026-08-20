import type { Metadata, Viewport } from "next";
import { Vazirmatn, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavDrawer } from "@/components/NavDrawer";
import { BackgroundCanvasLoader } from "@/components/BackgroundCanvasLoader";
import { SvgFilters } from "@/components/SvgFilters";
import { ConflictAlert } from "@/components/ConflictAlert";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { NotificationEngine } from "@/components/NotificationEngine";

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
const plexMono = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plexmono",
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
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${plexMono.variable}`}>
      {/* suppressHydrationWarning لازمه چون اسکریپتِ بالا ممکنه data-theme رو
          قبل از این‌که React هیدریت کنه عوض کرده باشه — یعنی یه mismatch
          «قابل‌انتظار و بی‌خطر» با همون چیزی که سرور رندر کرده (همیشه dark) */}
      <body data-theme="dark" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
