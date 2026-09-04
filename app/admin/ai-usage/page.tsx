"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { BarChart } from "@/components/admin/BarChart";
import { EmptyState } from "@/components/admin/EmptyState";
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
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    fetch(`/api/admin/ai-usage?${sp.toString()}`).then((r) => r.json()).then(setData);
  }, [searchParams]);

  return (
    <section>
      <div className="admin-chart-head" style={{ marginBottom: 18 }}>
        <div />
        <RangePicker />
      </div>

      {!data ? (
        <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : (
        <>
          <KpiGrid>
            <KpiTile label="تعداد درخواست‌ها" value={formatNumber(data.usage.totalRequests)} index={0} />
            <KpiTile label="توکن ورودی" value={formatNumber(data.usage.totalInputTokens)} index={1} />
            <KpiTile label="توکن خروجی" value={formatNumber(data.usage.totalOutputTokens)} index={2} />
            <KpiTile label="مجموع توکن" value={formatNumber(data.usage.totalInputTokens + data.usage.totalOutputTokens)} index={3} />
            <KpiTile label="هزینه تقریبی" value={formatUsdMicros(data.usage.totalCostUsdMicros)} index={4} />
            <KpiTile label="میانگین زمان پاسخ" value={data.usage.avgDurationMs != null ? `${data.usage.avgDurationMs}ms` : "—"} index={5} />
          </KpiGrid>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">درخواست‌ها بر اساس زمان</span></div>
            <BarChart data={data.usage.series.map((p) => ({ bucket: p.bucket, value: p.requests }))} color="#00A86B" />
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">مصرف بر اساس محصول</span></div>
            {data.usage.byFeature.length === 0 ? <EmptyState /> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>محصول</th><th>درخواست</th><th>توکن</th><th>هزینه تقریبی</th></tr></thead>
                  <tbody>
                    {data.usage.byFeature.map((f) => (
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
                    {data.usage.byModel.map((m) => (
                      <tr key={m.model}>
                        <td className="mono" style={{ direction: "ltr", textAlign: "right" }}>{m.model}</td>
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
        </>
      )}
    </section>
  );
}

export default function AdminAiUsagePage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">در حال بارگذاری…</div>}>
      <AiUsageInner />
    </Suspense>
  );
}
