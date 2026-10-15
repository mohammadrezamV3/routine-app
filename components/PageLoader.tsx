// جاگیر سبک داخل صفحه برای loading.tsx ها: فقط یک اسکلت ساده داخل محتوا، زیر
// هدر و بدون پرده یا لوگوی بزرگ. تا 200ms هیچی دیده نمی‌شه (animation-delay در
// globals.css) تا ناوبری سریع چشمک نزنه. بدون "use client" و بدون state.
import { tr } from "@/lib/i18n";

export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label={tr("در حال بارگذاری", "Loading")}>
      <div className="page-loader-skel" aria-hidden="true">
        <span className="pls-line" style={{ width: "38%" }} />
        <span className="pls-line pls-thin" style={{ width: "56%" }} />
        <div className="pls-grid">
          <span className="pls-card" />
          <span className="pls-card" />
          <span className="pls-card pls-wide" />
        </div>
      </div>
    </div>
  );
}
