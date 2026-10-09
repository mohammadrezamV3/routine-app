"use client";

import Link from "next/link";
import { useAdminAlerts, relAge } from "@/components/AdminAlerts";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { tr } from "@/lib/i18n";

// جزئیات همه‌ی شمارنده‌هایی که زنگوله هم نشون می‌ده؛ داده از همون
// AdminAlertsProvider شل میاد (یک درخواست، هر 60 ثانیه تازه می‌شه).
export default function AdminAlertsPage() {
  const { items, total, loading, error, reload } = useAdminAlerts();

  if (loading) return <LoadingState />;
  if (error && items.length === 0) return <ErrorState onRetry={reload} />;
  if (items.length === 0) return <EmptyState message={tr("هشداری برای نقش تو تعریف نشده", "No alerts are set up for your role")} />;

  return (
    <div className="ads-alerts">
      <p className="admin-section-hint" style={{ margin: 0 }}>
        {total > 0
          ? tr(`${total} مورد منتظر اقدام توئه`, total === 1 ? "1 item needs your action" : `${total} items need your action`)
          : tr("همه‌چیز مرتبه", "All clear")}
      </p>
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={`ads-alert-card${i.count === 0 ? " zero" : ""}`}>
          <span className={`ads-dot ads-dot-${i.tone}`} />
          <span className="ads-alert-body">
            <span className="ads-alert-title">{i.label}</span>
            <span className="ads-alert-sub">
              {i.count === 0 ? tr("موردی نیست", "Nothing here") : [
                i.oldestAt ? tr(`قدیمی‌ترین: ${relAge(i.oldestAt)}`, `Oldest: ${relAge(i.oldestAt)}`) : null,
                i.overdue ? tr(`${i.overdue} مورد بیشتر از 48 ساعت بدون پاسخ`, `${i.overdue} over 48 hours without a reply`) : null,
              ].filter(Boolean).join(" · ") || tr("نیاز به بررسی", "Needs review")}
            </span>
          </span>
          <span className="ads-alert-n">{i.count}</span>
          <span className="ads-alert-go">{tr("بررسی", "Review")}</span>
        </Link>
      ))}
    </div>
  );
}
