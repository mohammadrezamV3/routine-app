"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { BarChart } from "@/components/admin/BarChart";
import { formatNumber, formatPercent } from "@/lib/adminFormat";

type Resp = { churn: { canceledInRange: number; expiredInRange: number; churnRatePercent: number | null; atRiskCount: number; series: { bucket: string; canceled: number }[] } };

function ChurnInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    fetch(`/api/admin/churn?${sp.toString()}`).then((r) => r.json()).then(setData);
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
            <KpiTile label="لغو اشتراک" value={formatNumber(data.churn.canceledInRange)} index={0} />
            <KpiTile label="منقضی‌شده در بازه" value={formatNumber(data.churn.expiredInRange)} index={1} />
            <KpiTile label="نرخ Churn" value={formatPercent(data.churn.churnRatePercent)} index={2} />
            <KpiTile label="در معرض ریزش (۷ روز آینده)" value={formatNumber(data.churn.atRiskCount)} index={3} />
          </KpiGrid>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">روند لغو اشتراک</span></div>
            <BarChart data={data.churn.series.map((p) => ({ bucket: p.bucket, value: p.canceled }))} color="var(--adm-red)" />
          </div>
        </>
      )}
    </section>
  );
}

export default function AdminChurnPage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">در حال بارگذاری…</div>}>
      <ChurnInner />
    </Suspense>
  );
}
