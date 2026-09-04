"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { BarChart } from "@/components/admin/BarChart";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrencyAmount } from "@/lib/adminFormat";

type Resp = {
  revenue: {
    series: { bucket: string; byCurrency: Record<string, number> }[];
    totalByCurrency: Record<string, number>;
    purchaseCountByCurrency: Record<string, number>;
    avgPurchaseValueByCurrency: Record<string, number>;
    refundedAmountByCurrency: Record<string, number>;
    netRevenueByCurrency: Record<string, number>;
  };
};

function RevenueInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    fetch(`/api/admin/revenue?${sp.toString()}`).then((r) => r.json()).then(setData);
  }, [searchParams]);

  const currencies = data ? Object.keys(data.revenue.totalByCurrency) : [];

  return (
    <section>
      <div className="admin-chart-head" style={{ marginBottom: 18 }}>
        <div />
        <RangePicker />
      </div>

      {!data ? (
        <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : currencies.length === 0 ? (
        <EmptyState message="در این بازه هیچ درآمدی ثبت نشده" />
      ) : (
        currencies.map((cur) => (
          <div key={cur} style={{ marginBottom: 26 }}>
            <div className="admin-section-title">درآمد — {cur === "IRR" ? "بازار ایران (تومان)" : "بازار بین‌المللی (دلار)"}</div>
            <KpiGrid>
              <KpiTile label="درآمد ناخالص" value={formatCurrencyAmount(data.revenue.totalByCurrency[cur], cur)} index={0} />
              <KpiTile label="درآمد خالص" value={formatCurrencyAmount(data.revenue.netRevenueByCurrency[cur] || 0, cur)} index={1} />
              <KpiTile label="تعداد خرید" value={String(data.revenue.purchaseCountByCurrency[cur] || 0)} index={2} />
              <KpiTile label="میانگین ارزش خرید" value={formatCurrencyAmount(data.revenue.avgPurchaseValueByCurrency[cur] || 0, cur)} index={3} />
              <KpiTile label="بازپرداخت" value={formatCurrencyAmount(data.revenue.refundedAmountByCurrency[cur] || 0, cur)} index={4} />
            </KpiGrid>

            <div className="admin-chart-card">
              <div className="admin-chart-head"><span className="admin-chart-title">روند درآمد</span></div>
              <BarChart
                data={data.revenue.series.map((p) => ({ bucket: p.bucket, value: p.byCurrency[cur] || 0 }))}
                formatValue={(v) => formatCurrencyAmount(v, cur)}
              />
            </div>
          </div>
        ))
      )}

      <Link href="/admin/transactions" className="admin-btn" style={{ textDecoration: "none", display: "inline-flex" }}>مشاهده همه تراکنش‌ها</Link>
    </section>
  );
}

export default function AdminRevenuePage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">در حال بارگذاری…</div>}>
      <RevenueInner />
    </Suspense>
  );
}
