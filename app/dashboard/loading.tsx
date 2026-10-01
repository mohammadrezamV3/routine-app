import { PageLoader } from "@/components/PageLoader";

// بازخورد فوری هنگام باز شدن صفحه: نشان برند با حلقه‌ی چرخان و اسکلت صفحه
// تا رندر سمت سرور تموم بشه. عمدا per-route و نه app/loading.tsx  ریشه:
// مرز Suspense  ریشه notFound()  /admin و /blog رو به HTTP 200 (soft-404)
// تبدیل می‌کرد و وجود /admin رو از روی کد وضعیت لو می‌داد.
export default function Loading() {
  return <PageLoader />;
}
