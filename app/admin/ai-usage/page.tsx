"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { BarChart } from "@/components/admin/BarChart";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { useAdminData } from "@/components/admin/useAdminData";
import { formatNumber, formatUsdMicros } from "@/lib/adminFormat";

const FEATURE_LABEL_FA: Record<string, string> = {
  ROADMAP_GENERATION: "Skill / یادگیری",
  EXERCISE_PLAN_GENERATION: "بدنسازی",
  FOOD_SCAN: "کالری",
  DAILY_BRIEFING: "بریفینگ روزانه (هنوز فعال نیست)",
  WEEKLY_COACH_REPORT: "گزارش هفتگی مربی (هنوز فعال نیست)",
  CORRELATION_INSIGHT: "AI Insight (هنوز فعال نیست)",
};

type Resp = {
  usage: {
    totalRequests: number; successRequests: number; totalInputTokens: number; totalOutputTokens: number; totalCostUsdMicros: number; avgDurationMs: number | null;
    byFeature: { feature: string; requests: number; inputTokens: number; outputTokens: number; costUsdMicros: number }[];
    byModel: { model: string; requests: number; inputTokens: number; outputTokens: number; costUsdMicros: number }[];
    series: { bucket: string; requests: number; costUsdMicros: number }[];
  };
};

function AiUsageInner() {
  const searchParams = useSearchParams();
  const { data, error, loading, reload } = useAdminData<Resp>(`/api/admin/ai-usage?${searchParams.toString()}`);

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
            <KpiTile label="تعداد درخواست‌ها" value={formatNumber(data.usage.totalRequests)} index={0} />
            <KpiTile label="توکن ورودی" value={formatNumber(data.usage.totalInputTokens)} index={1} />
            <KpiTile label="توکن خروجی" value={formatNumber(data.usage.totalOutputTokens)} index={2} />
            <KpiTile label="مجموع توکن" value={formatNumber(data.usage.totalInputTokens + data.usage.totalOutputTokens)} index={3} />
            <KpiTile label="هزینه تقریبی" value={formatUsdMicros(data.usage.totalCostUsdMicros)} index={4} />
            <KpiTile label="میانگین زمان پاسخ" value={data.usage.avgDurationMs != null ? `${formatNumber(data.usage.avgDurationMs)} ms` : "—"} index={5} />
          </KpiGrid>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">درخواست‌ها بر اساس زمان</span></div>
            <BarChart data={data.usage.series.map((p) => ({ bucket: p.bucket, value: p.requests }))} />
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">مصرف بر اساس محصول</span></div>
            {data.usage.byFeature.length === 0 ? <EmptyState /> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>محصول</th><th>درخواست</th><th>توکن</th><th>هزینه تقریبی</th></tr></thead>
                  <tbody>
                    {[...data.usage.byFeature].sort((a, b) => b.requests - a.requests).map((f) => (
                      <tr key={f.feature}>
                        <td>{FEATURE_LABEL_FA[f.feature] || f.feature}</td>
                        <td>{formatNumber(f.requests)}</td>
                        <td>{formatNumber(f.inputTokens + f.outputTokens)}</td>
                        <td>{formatUsdMicros(f.costUsdMicros)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">مصرف بر اساس مدل</span></div>
            {data.usage.byModel.length === 0 ? <EmptyState /> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>مدل</th><th>درخواست</th><th>توکن</th><th>هزینه تقریبی</th></tr></thead>
                  <tbody>
                    {[...data.usage.byModel].sort((a, b) => b.requests - a.requests).map((m) => (
                      <tr key={m.model}>
                        <td className="mono admin-ltr">{m.model}</td>
                        <td>{formatNumber(m.requests)}</td>
                        <td>{formatNumber(m.inputTokens + m.outputTokens)}</td>
                        <td>{formatUsdMicros(m.costUsdMicros)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-section-hint">
            هزینه‌ها تخمینی‌ان — بر اساس نرخ ورودی/خروجی قابل‌تنظیم در «تنظیمات Owner»، نه صورت‌حساب واقعی گیت‌وی.
          </div>
        </div>
      )}
    </section>
  );
}

export default function AdminAiUsagePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AiUsageInner />
    </Suspense>
  );
}
