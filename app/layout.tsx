import type { Metadata } from "next";
import { Vazirmatn, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavDrawer } from "@/components/NavDrawer";
import { BackgroundCanvasLoader } from "@/components/BackgroundCanvasLoader";
import { SvgFilters } from "@/components/SvgFilters";
import { ConflictAlert } from "@/components/ConflictAlert";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-vazir",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
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
            <div className="wrap">{children}</div>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
