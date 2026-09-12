import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { BRAND_FA } from "@/lib/brand";

/**
 * صفحه‌ای که سرویس‌ورکر وقتی شبکه نیست نشان می‌دهد.
 *
 * عمدا noindex: این یک صفحه‌ی فنیِ fallback است، نه محتوایی که کسی باید
 * از گوگل به آن برسد. عمدا هم کاملا ساکن (بدون fetch و بدون state) —
 * صفحه‌ای که خودش برای رندر شدن به شبکه نیاز داشته باشد، دقیقا در لحظه‌ای
 * که لازم است کار نمی‌کند.
 */
export const metadata: Metadata = {
  title: { absolute: `آفلاین | ${BRAND_FA}` },
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="offline-wrap">
      <WifiOff size={40} aria-hidden="true" style={{ color: "var(--muted)" }} />
      <h1>اتصال اینترنت نداری</h1>
      <p>
        بخش‌هایی که قبلا باز کرده‌ای از حافظه‌ی دستگاه می‌آیند، ولی برای دیدن
        اطلاعات تازه به اینترنت نیاز داری. وصل که شدی، همین صفحه را دوباره باز کن.
      </p>
    </main>
  );
}
