import type { Metadata } from "next";
import { DashboardClient } from "@/components/DashboardClient";

// Server Component نازک — فقط برای metadata؛ کلِ منطق در DashboardClient.
// صفحه‌ی فقط‌ورودیه، پس ایندکس نمی‌شه (هم‌الگوی /admin و بقیه‌ی صفحه‌های حساب).
export const metadata: Metadata = {
  title: "داشبورد",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
