"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { useAdminData } from "@/components/admin/useAdminData";
import { formatNumber } from "@/lib/adminFormat";

type Step = { key: string; label: string; count: number };

function FunnelInner() {
  const searchParams = useSearchParams();
  const { data, error, loading, reload } = useAdminData<{ steps: Step[] }>(`/api/admin/funnel?${searchParams.toString()}`);
  const steps = data?.steps ?? null;
  const maxCount = steps && steps.length ? Math.max(1, ...steps.map((s) => s.count)) : 1;

  return (
    <section>
      <div className="admin-range-bar">
        <RangePicker />
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">Funnel تبدیل کاربر (بر اساس کاربران ثبت‌نام‌کرده در این بازه)</span></div>
        {!steps ? (
          error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState />
        ) : steps.length === 0 || steps[0].count === 0 ? (
          <EmptyState message="در این بازه ثبت‌نام جدیدی نبوده" />
        ) : (
          <div className={`admin-funnel${loading ? " admin-refreshing" : ""}`} aria-busy={loading}>
            {error && <ErrorState message={error} onRetry={reload} />}
            {steps.map((s, i) => {
              const prev = i > 0 ? steps[i - 1].count : 0;
              const convFromPrev = i > 0 && prev > 0 ? Math.round((s.count / prev) * 1000) / 10 : null;
              const widthPercent = s.count > 0 ? Math.max(2, (s.count / maxCount) * 100) : 0;
              return (
                <div key={s.key} className="admin-funnel-step">
                  <div className="admin-funnel-row">
                    <span className="admin-funnel-label">{s.label}</span>
                    <span className="admin-funnel-meta">
                      <b className="admin-ltr">{formatNumber(s.count)}</b>
                      {convFromPrev !== null && (
                        <span className={convFromPrev >= 50 ? "is-good" : "is-low"}>
                          (<bdi>{convFromPrev}%</bdi> از مرحله قبل)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="admin-funnel-track">
                    <div className="admin-funnel-fill" style={{ width: `${widthPercent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="admin-section-hint">
        «مشاهده پلن» و «شروع خرید» فقط از تاریخ فعال‌سازی ردیابی این دو رویداد قابل‌ثبت هستن — بازه‌های قدیمی‌تر برای این دو مرحله صفر نشون می‌دن.
      </div>
    </section>
  );
}

export default function AdminFunnelPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FunnelInner />
    </Suspense>
  );
}
