"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { BarChart } from "@/components/admin/BarChart";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { useAdminData } from "@/components/admin/useAdminData";
import { formatNumber, formatUsdMicros } from "@/lib/adminFormat";
import { pick, tr, type Localized } from "@/lib/i18n";

const FEATURE_LABEL: Record<string, Localized> = {
  ROADMAP_GENERATION: { fa: "Skill / یادگیری", en: "Skill / learning" },
  EXERCISE_PLAN_GENERATION: { fa: "بدنسازی", en: "Workout" },
  FOOD_SCAN: { fa: "کالری", en: "Calories" },
  DAILY_BRIEFING: { fa: "بریفینگ روزانه (هنوز فعال نیست)", en: "Daily briefing (not active yet)" },
  WEEKLY_COACH_REPORT: { fa: "گزارش هفتگی مربی (هنوز فعال نیست)", en: "Weekly coach report (not active yet)" },
  CORRELATION_INSIGHT: { fa: "AI Insight (هنوز فعال نیست)", en: "AI Insight (not active yet)" },
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
            <KpiTile label={tr("تعداد درخواست‌ها", "Requests")} value={formatNumber(data.usage.totalRequests)} index={0} />
            <KpiTile label={tr("توکن ورودی", "Input tokens")} value={formatNumber(data.usage.totalInputTokens)} index={1} />
            <KpiTile label={tr("توکن خروجی", "Output tokens")} value={formatNumber(data.usage.totalOutputTokens)} index={2} />
            <KpiTile label={tr("مجموع توکن", "Total tokens")} value={formatNumber(data.usage.totalInputTokens + data.usage.totalOutputTokens)} index={3} />
            <KpiTile label={tr("هزینه تقریبی", "Approx. cost")} value={formatUsdMicros(data.usage.totalCostUsdMicros)} index={4} />
            <KpiTile label={tr("میانگین زمان پاسخ", "Avg response time")} value={data.usage.avgDurationMs != null ? `${formatNumber(data.usage.avgDurationMs)} ms` : "—"} index={5} />
          </KpiGrid>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">{tr("درخواست‌ها بر اساس زمان", "Requests over time")}</span></div>
            <BarChart data={data.usage.series.map((p) => ({ bucket: p.bucket, value: p.requests }))} />
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">{tr("مصرف بر اساس محصول", "Usage by product")}</span></div>
            {data.usage.byFeature.length === 0 ? <EmptyState /> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>{tr("محصول", "Product")}</th><th>{tr("درخواست", "Requests")}</th><th>{tr("توکن", "Tokens")}</th><th>{tr("هزینه تقریبی", "Approx. cost")}</th></tr></thead>
                  <tbody>
                    {[...data.usage.byFeature].sort((a, b) => b.requests - a.requests).map((f) => (
                      <tr key={f.feature}>
                        <td>{FEATURE_LABEL[f.feature] ? pick(FEATURE_LABEL[f.feature]) : f.feature}</td>
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
            <div className="admin-chart-head"><span className="admin-chart-title">{tr("مصرف بر اساس مدل", "Usage by model")}</span></div>
            {data.usage.byModel.length === 0 ? <EmptyState /> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>{tr("مدل", "Model")}</th><th>{tr("درخواست", "Requests")}</th><th>{tr("توکن", "Tokens")}</th><th>{tr("هزینه تقریبی", "Approx. cost")}</th></tr></thead>
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
            {tr(
              "هزینه‌ها تخمینی‌ان — بر اساس نرخ ورودی/خروجی قابل‌تنظیم در «تنظیمات Owner»، نه صورت‌حساب واقعی گیت‌وی.",
              "Costs are estimates based on the input/output rates set in Owner settings, not the gateway's actual bill.",
            )}
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
