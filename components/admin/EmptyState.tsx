import { Inbox, AlertTriangle, RotateCw } from "lucide-react";

export function EmptyState({ message = "داده‌ای برای نمایش وجود ندارد" }: { message?: string }) {
  return (
    <div className="admin-empty">
      <Inbox size={22} strokeWidth={1.5} />
      <span>{message}</span>
    </div>
  );
}

// حالت بارگذاری — همون .is-loading سراسری اپ (دایره‌ی چرخان)
export function LoadingState({ message = "در حال بارگذاری…" }: { message?: string }) {
  return <div className="admin-empty is-loading" role="status">{message}</div>;
}

// حالت خطا با دکمه‌ی «تلاش دوباره» — به‌جای لودینگ بی‌پایان وقتی API خطا داد
export function ErrorState({ message = "خطا در دریافت اطلاعات", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="admin-empty admin-empty-error" role="alert">
      <AlertTriangle size={22} strokeWidth={1.5} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="admin-btn sm" onClick={onRetry}>
          <RotateCw size={13} /> تلاش دوباره
        </button>
      )}
    </div>
  );
}
