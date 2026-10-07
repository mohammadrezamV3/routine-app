"use client";

import "./admin-dashboard.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useAdminData } from "@/components/admin/useAdminData";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { dashRangeDays, type DashRange } from "@/lib/adminOverview";
import type { OverviewDashboard } from "@/lib/adminOverviewServer";
import { DashboardSkeleton, FeedCard, FunnelCard, HealthCard, KpiCard, ModulesCard, QueueCard, RevenueChart, TransactionsCard } from "@/components/AdminDashboardParts";

const RANGE_OPTIONS: { value: DashRange; label: string }[] = [
  { value: "today", label: "امروز" },
  { value: "7d", label: "7 روز" },
  { value: "30d", label: "30 روز" },
  { value: "90d", label: "90 روز" },
];

function todayLabel(): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tehran" }).format(new Date());
  } catch {
    return "";
  }
}

export function AdminDashboard() {
  const { can } = useAdminAccess();
  const [range, setRange] = useState<DashRange>("30d");
  const { data, error, loading, reload } = useAdminData<{ dashboard: OverviewDashboard }>(`/api/admin/overview?range=${range}`);
  const d = data?.dashboard ?? null;
  const date = useMemo(todayLabel, []);
  const seriesDays = Math.max(dashRangeDays(range), 7);

  return (
    <section className="adb" aria-busy={loading}>
      <div className="adb-head">
        <div className="adb-head-text">
          <h1 className="adb-title">سلام</h1>
          <span className="adb-sub">{date}{d ? ` · ${d.queueTotal} مورد منتظر اقدام` : ""}</span>
        </div>
        <div className="adb-actions">
          {can("discounts") && <Link href="/admin/discount-codes" className="admin-btn">+ کد تخفیف</Link>}
          {can("content") && <Link href="/admin/announcements" className="admin-btn">+ اطلاعیه</Link>}
          {can("content") && <Link href="/admin/broadcast" className="admin-btn primary">پیام همگانی</Link>}
        </div>
      </div>

      <div className="adb-toolbar">
        <SegmentedTabs<DashRange> options={RANGE_OPTIONS} active={range} onChange={setRange} ariaLabel="بازه‌ی زمانی" />
      </div>

      {!d ? (
        error ? (
          <div className="adb-err">{error}<button type="button" className="admin-btn" onClick={reload}>تلاش دوباره</button></div>
        ) : <DashboardSkeleton />
      ) : (
        <div className="adb" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
          {error && <div className="adb-err">{error}<button type="button" className="admin-btn" onClick={reload}>تلاش دوباره</button></div>}

          <div className="adb-kpis" aria-label="شاخص‌ها">
            {d.kpis.totalUsers && <KpiCard label="کل کاربران" k={d.kpis.totalUsers} color="var(--ring-2a)" />}
            {d.kpis.activeUsers && <KpiCard label="کاربران فعال" k={d.kpis.activeUsers} color="var(--accent)" />}
            {d.kpis.revenue && <KpiCard label="درآمد" k={d.kpis.revenue} color="var(--accent)" />}
            {d.kpis.activeSubs && <KpiCard label="اشتراک فعال" k={d.kpis.activeSubs} color="var(--ring-2b)" />}
            {d.kpis.churn && <KpiCard label="نرخ ریزش" k={d.kpis.churn} invert color="var(--ring-3a)" />}
            {d.kpis.openTickets && <KpiCard label="تیکت باز" k={d.kpis.openTickets} invert color="var(--ring-3b)" />}
          </div>

          {(d.chart && (d.can.users || d.can.finance)) || d.queue.length > 0 ? (
            <div className="adb-grid">
              {d.chart && (d.can.users || d.can.finance) && (
                <div className="adb-card adb-span-8">
                  <RevenueChart chart={d.chart} days={seriesDays} canRevenue={d.can.finance} />
                </div>
              )}
              {d.queue.length > 0 && <QueueCard items={d.queue} total={d.queueTotal} />}
            </div>
          ) : null}

          {(d.funnel || d.modules || d.health) && (
            <div className="adb-grid">
              {d.funnel && <FunnelCard steps={d.funnel} />}
              {d.modules && <ModulesCard modules={d.modules} />}
              {d.health && <HealthCard h={d.health} />}
            </div>
          )}

          {(d.feed.length > 0 || d.transactions) && (
            <div className="adb-grid">
              <FeedCard items={d.feed} />
              {d.transactions && <TransactionsCard rows={d.transactions} canUsers={d.can.users} />}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
