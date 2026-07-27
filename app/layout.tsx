import type { Metadata } from "next";
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
  title: "روتین من",
  description: "روتین، خواب، ترید، ورزش و رودمپ‌های شخصی — همه‌جا یکجا",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${plexMono.variable}`}>
      <body data-theme="dark">
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
