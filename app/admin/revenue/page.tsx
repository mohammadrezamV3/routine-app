"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { BarChart } from "@/components/admin/BarChart";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { useAdminData } from "@/components/admin/useAdminData";
import { formatCurrencyAmount, formatNumber } from "@/lib/adminFormat";
import { pick, tr, type Localized } from "@/lib/i18n";

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

const MARKET_LABEL: Record<string, Localized> = {
  IRR: { fa: "بازار ایران (تومان)", en: "Iran market (toman)" },
  USD: { fa: "بازار بین‌المللی (دلار)", en: "International market (USD)" },
};

function RevenueInner() {
  const searchParams = useSearchParams();
  const { data, error, loading, reload } = useAdminData<Resp>(`/api/admin/revenue?${searchParams.toString()}`);

  // ارزی که توی این بازه فقط بازپرداخت داشته (بدون خرید) هم باید دیده بشه —
  // قبلا فقط کلیدهای totalByCurrency خونده می‌شد و بازه «بدون درآمد» نشون داده می‌شد.
  const currencies = data
    ? Array.from(new Set([...Object.keys(data.revenue.totalByCurrency), ...Object.keys(data.revenue.refundedAmountByCurrency)]))
    : [];

  return (
    <section>
      <div className="admin-range-bar">
        <Link href="/admin/transactions" className="admin-btn sm">{tr("مشاهده همه تراکنش‌ها", "View all transactions")}</Link>
        <RangePicker />
      </div>

      {!data ? (
        error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState />
      ) : (
        <div className={loading ? "admin-refreshing" : undefined} aria-busy={loading}>
          {error && <ErrorState message={error} onRetry={reload} />}
          {currencies.length === 0 ? (
            <EmptyState message={tr("در این بازه هیچ درآمدی ثبت نشده", "No revenue recorded in this period")} />
          ) : (
            currencies.map((cur) => (
              <div key={cur} className="admin-revenue-block">
                <div className="admin-section-title">{tr("درآمد", "Revenue")} — {MARKET_LABEL[cur] ? pick(MARKET_LABEL[cur]) : cur}</div>
                <KpiGrid>
                  <KpiTile label={tr("درآمد ناخالص", "Gross revenue")} value={formatCurrencyAmount(data.revenue.totalByCurrency[cur] || 0, cur)} index={0} />
                  <KpiTile label={tr("درآمد خالص", "Net revenue")} value={formatCurrencyAmount(data.revenue.netRevenueByCurrency[cur] || 0, cur)} index={1} />
                  <KpiTile label={tr("تعداد خرید", "Purchases")} value={formatNumber(data.revenue.purchaseCountByCurrency[cur] || 0)} index={2} />
                  <KpiTile label={tr("میانگین ارزش خرید", "Avg purchase value")} value={formatCurrencyAmount(data.revenue.avgPurchaseValueByCurrency[cur] || 0, cur)} index={3} />
                  <KpiTile label={tr("بازپرداخت", "Refunds")} value={formatCurrencyAmount(data.revenue.refundedAmountByCurrency[cur] || 0, cur)} index={4} />
                </KpiGrid>

                <div className="admin-chart-card">
                  <div className="admin-chart-head"><span className="admin-chart-title">{tr("روند درآمد", "Revenue trend")}</span></div>
                  <BarChart
                    data={data.revenue.series.map((p) => ({ bucket: p.bucket, value: p.byCurrency[cur] || 0 }))}
                    formatValue={(v) => formatCurrencyAmount(v, cur)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default function AdminRevenuePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RevenueInner />
    </Suspense>
  );
}
