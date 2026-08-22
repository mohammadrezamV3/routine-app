"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { MultiLineChart } from "@/components/admin/MultiLineChart";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrencyAmount, formatNumber, formatPercent } from "@/lib/adminFormat";

type OverviewResponse = {
  kpis: {
    totalUsers: number; newUsers: number; newUsersGrowthPercent: number | null;
    activeUsers: number; paidUsers: number;
    revenueByCurrency: Record<string, number>; revenueGrowthPercentByCurrency: Record<string, number | null>;
    refundsCount: number;
  };
  growthSeries: { bucket: string; newUsers: number; activeUsers: number; paidUsers: number }[];
  planBreakdown: { plan: { id: string; nameFa: string; market: string; currency: string; priceMonthly: number }; active: number; expired: number; newInRange: number; canceledInRange: number }[];
};

function OverviewInner() {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "30d";
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams(searchParams.toString());
    fetch(`/api/admin/overview?${sp.toString()}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [range, searchParams]);

  return (
    <section>
      <div className="admin-chart-head" style={{ marginBottom: 18 }}>
        <div />
        <RangePicker />
      </div>

      {!data ? (
        <div className="admin-empty">{loading ? "در حال بارگذاری…" : "خطا در دریافت اطلاعات"}</div>
      ) : (
        <>
          <KpiGrid>
            <KpiTile label="کاربران کل" value={formatNumber(data.kpis.totalUsers)} index={0} />
            <KpiTile label="کاربران فعال (این بازه)" value={formatNumber(data.kpis.activeUsers)} index={1} />
            <KpiTile label="کاربران جدید" value={formatNumber(data.kpis.newUsers)} deltaPercent={data.kpis.newUsersGrowthPercent} index={2} />
            <KpiTile label="کاربران پولی" value={formatNumber(data.kpis.paidUsers)} index={3} />
            {Object.keys(data.kpis.revenueByCurrency).length === 0 ? (
              <KpiTile label="درآمد" value="—" index={4} />
            ) : (
              Object.entries(data.kpis.revenueByCurrency).map(([cur, amt], i) => (
                <KpiTile key={cur} label={`درآمد (${cur})`} value={formatCurrencyAmount(amt, cur)} deltaPercent={data.kpis.revenueGrowthPercentByCurrency[cur]} index={4 + i} />
              ))
            )}
            <KpiTile label="رشد کاربران جدید" value={formatPercent(data.kpis.newUsersGrowthPercent)} index={6} />
          </KpiGrid>

          <div className="admin-chart-card">
            <div className="admin-chart-head">
              <span className="admin-chart-title">رشد کاربران</span>
            </div>
            <MultiLineChart
              data={data.growthSeries.map((p) => ({ bucket: p.bucket, values: { newUsers: p.newUsers, activeUsers: p.activeUsers, paidUsers: p.paidUsers } }))}
              series={[
                { key: "newUsers", label: "کاربران جدید", color: "#00A86B" },
                { key: "activeUsers", label: "کاربران فعال", color: "#5b9cf6" },
                { key: "paidUsers", label: "کاربران پولی", color: "#e0a636" },
              ]}
            />
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-head">
              <span className="admin-chart-title">اشتراک‌ها بر اساس پلن</span>
            </div>
            {data.planBreakdown.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>پلن</th><th>بازار</th><th>فعال</th><th>منقضی</th><th>خرید جدید</th><th>لغوشده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.planBreakdown.map((row) => (
                      <tr key={row.plan.id}>
                        <td>{row.plan.nameFa}</td>
                        <td>{row.plan.market === "IRAN" ? "ایران" : "بین‌المللی"}</td>
                        <td>{formatNumber(row.active)}</td>
                        <td>{formatNumber(row.expired)}</td>
                        <td>{formatNumber(row.newInRange)}</td>
                        <td>{formatNumber(row.canceledInRange)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<div className="admin-empty">در حال بارگذاری…</div>}>
      <OverviewInner />
    </Suspense>
  );
}
