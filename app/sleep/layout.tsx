import "@/app/_area/sleep.css";
import { SleepSky } from "@/components/SleepSky";

// آسمان رصدخانه اینجا رندر می‌شه: layout همگام و بدون await ـه، پس جزو پوسته‌ی
// اولین HTML و پیش‌واکشی ناوبری‌ست و با اسکلت loading.tsx همزمان (نه بعد از گیت، سشن،
// هیدریشن یا لود چانک صفحه) پیدا می‌شه. گیت فلگ «sleep» (خاموش/روشن از /admin/features)
// عمدا داخل page.tsx ـه، یعنی زیر مرز Suspense همین مسیر.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SleepSky />
      {children}
    </>
  );
}
