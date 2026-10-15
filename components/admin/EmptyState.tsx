import { Inbox, AlertTriangle, RotateCw } from "lucide-react";
import { tr } from "@/lib/i18n";

export function EmptyState({ message = tr("داده‌ای برای نمایش وجود ندارد", "No data to show") }: { message?: string }) {
  return (
    <div className="admin-empty">
      <Inbox size={22} strokeWidth={1.5} />
      <span>{message}</span>
    </div>
  );
}

// حالت بارگذاری — همون .is-loading سراسری اپ (دایره‌ی چرخان)
export function LoadingState({ message = tr("در حال بارگذاری…", "Loading…") }: { message?: string }) {
  return <div className="admin-empty is-loading" role="status">{message}</div>;
}

// حالت خطا با دکمه‌ی «تلاش دوباره» — به‌جای لودینگ بی‌پایان وقتی API خطا داد
export function ErrorState({ message = tr("خطا در دریافت اطلاعات", "Couldn't load data"), onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="admin-empty admin-empty-error" role="alert">
      <AlertTriangle size={22} strokeWidth={1.5} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="admin-btn sm" onClick={onRetry}>
          <RotateCw size={13} /> {tr("تلاش دوباره", "Try again")}
        </button>
      )}
    </div>
  );
}
