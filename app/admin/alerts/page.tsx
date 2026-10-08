"use client";

import Link from "next/link";
import { useAdminAlerts, relAge } from "@/components/AdminAlerts";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";

// جزئیات همه‌ی شمارنده‌هایی که زنگوله هم نشون می‌ده؛ داده از همون
// AdminAlertsProvider شل میاد (یک درخواست، هر 60 ثانیه تازه می‌شه).
export default function AdminAlertsPage() {
  const { items, total, loading, error, reload } = useAdminAlerts();

  if (loading) return <LoadingState />;
  if (error && items.length === 0) return <ErrorState onRetry={reload} />;
  if (items.length === 0) return <EmptyState message="هشداری برای نقش تو تعریف نشده" />;

  return (
    <div className="ads-alerts">
      <p className="admin-section-hint" style={{ margin: 0 }}>
        {total > 0 ? `${total} مورد منتظر اقدام توئه` : "همه‌چیز مرتبه"}
      </p>
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={`ads-alert-card${i.count === 0 ? " zero" : ""}`}>
          <span className={`ads-dot ads-dot-${i.tone}`} />
          <span className="ads-alert-body">
            <span className="ads-alert-title">{i.label}</span>
            <span className="ads-alert-sub">
              {i.count === 0 ? "موردی نیست" : [
                i.oldestAt ? `قدیمی‌ترین: ${relAge(i.oldestAt)}` : null,
                i.overdue ? `${i.overdue} مورد بیشتر از 48 ساعت بدون پاسخ` : null,
              ].filter(Boolean).join(" · ") || "نیاز به بررسی"}
            </span>
          </span>
          <span className="ads-alert-n">{i.count}</span>
          <span className="ads-alert-go">بررسی</span>
        </Link>
      ))}
    </div>
  );
}
