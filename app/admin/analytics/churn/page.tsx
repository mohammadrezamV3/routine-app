"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { BarChart } from "@/components/admin/BarChart";
import { ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { useAdminData } from "@/components/admin/useAdminData";
import { formatNumber } from "@/lib/adminFormat";

type Resp = { churn: { canceledInRange: number; expiredInRange: number; churnRatePercent: number | null; atRiskCount: number; series: { bucket: string; canceled: number }[] } };

// نرخ (نه تغییر) — بدون علامتِ «+» که formatPercent برای رشد می‌ذاره
const formatRate = (n: number | null) => (n == null ? "—" : `${n}%`);

function ChurnInner() {
  const searchParams = useSearchParams();
  const { data, error, loading, reload } = useAdminData<Resp>(`/api/admin/churn?${searchParams.toString()}`);

  return (
    <section>
      <div className="admin-range-bar">
        <RangePicker />
      </div>

      {!data ? (
        error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState />
      ) : (
        <div className={loading ? "admin-refreshing" : undefined} aria-busy={loading}>
          {error && <ErrorState message={error} onRetry={reload} />}
          <KpiGrid>
            <KpiTile label="لغو اشتراک" value={formatNumber(data.churn.canceledInRange)} index={0} />
            <KpiTile label="منقضی‌شده در بازه" value={formatNumber(data.churn.expiredInRange)} index={1} />
            <KpiTile label="نرخ Churn" value={formatRate(data.churn.churnRatePercent)} index={2} />
            <KpiTile label="در معرض ریزش (۷ روز آینده)" value={formatNumber(data.churn.atRiskCount)} index={3} />
          </KpiGrid>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">روند لغو اشتراک</span></div>
            <BarChart data={data.churn.series.map((p) => ({ bucket: p.bucket, value: p.canceled }))} color="var(--adm-red)" />
          </div>
          <div className="admin-section-hint">
            نرخ Churn = لغوهای این بازه تقسیم بر اشتراک‌های فعالی که قبل از شروع بازه شروع شده بودن.
          </div>
        </div>
      )}
    </section>
  );
}

export default function AdminChurnPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ChurnInner />
    </Suspense>
  );
}
