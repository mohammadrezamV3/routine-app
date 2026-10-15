import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";

/**
 * صفحه‌ای که سرویس‌ورکر وقتی شبکه نیست نشان می‌دهد.
 *
 * عمدا noindex: این یک صفحه‌ی فنی fallback است، نه محتوایی که کسی باید
 * از گوگل به آن برسد. عمدا هم کاملا ساکن (بدون fetch و بدون state) —
 * صفحه‌ای که خودش برای رندر شدن به شبکه نیاز داشته باشد، دقیقا در لحظه‌ای
 * که لازم است کار نمی‌کند.
 */
export function generateMetadata(): Metadata {
  return {
    title: { absolute: `${tr("آفلاین", "Offline")} | ${brandName()}` },
    robots: { index: false, follow: false },
  };
}

export default function OfflinePage() {
  return (
    <main className="offline-wrap">
      <WifiOff size={40} aria-hidden="true" style={{ color: "var(--muted)" }} />
      <h1>{tr("اتصال اینترنت نداری", "You are offline")}</h1>
      <p>
        {tr(
          "بخش‌هایی که قبلا باز کرده‌ای از حافظه‌ی دستگاه می‌آیند، ولی برای دیدن اطلاعات تازه به اینترنت نیاز داری. وصل که شدی، همین صفحه را دوباره باز کن.",
          "Sections you have opened before load from your device, but you need an internet connection to see fresh data. Once you are back online, open this page again.",
        )}
      </p>
    </main>
  );
}
