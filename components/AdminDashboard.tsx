"use client";

import "./admin-dashboard.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import { tr } from "@/lib/i18n";
import { useIsEn } from "@/components/I18nProvider";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useAdminData } from "@/components/admin/useAdminData";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { dashRangeDays, type DashRange } from "@/lib/adminOverview";
import type { OverviewDashboard } from "@/lib/adminOverviewServer";
import { DashboardSkeleton, FeedCard, FunnelCard, HealthCard, KpiCard, ModulesCard, QueueCard, RevenueChart, TransactionsCard } from "@/components/AdminDashboardParts";

// تابع (نه ثابت ماژول) تا برچسب‌ها با زبان جاری حل بشن
function rangeOptions(): { value: DashRange; label: string }[] {
  return [
    { value: "today", label: tr("امروز", "Today") },
    { value: "7d", label: tr("7 روز", "7 days") },
    { value: "30d", label: tr("30 روز", "30 days") },
    { value: "90d", label: tr("90 روز", "90 days") },
  ];
}

function todayLabel(en: boolean): string {
  try {
    return new Intl.DateTimeFormat(en ? "en-US" : "fa-IR-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tehran" }).format(new Date());
  } catch {
    return "";
  }
}

export function AdminDashboard() {
  const { can } = useAdminAccess();
  const [range, setRange] = useState<DashRange>("30d");
  const { data, error, loading, reload } = useAdminData<{ dashboard: OverviewDashboard }>(`/api/admin/overview?range=${range}`);
  const d = data?.dashboard ?? null;
  const en = useIsEn();
  const date = useMemo(() => todayLabel(en), [en]);
  const seriesDays = Math.max(dashRangeDays(range), 7);

  return (
    <section className="adb" aria-busy={loading}>
      <div className="adb-head">
        <div className="adb-head-text">
          <h1 className="adb-title">{tr("سلام", "Hello")}</h1>
          <span className="adb-sub">{date}{d ? tr(` · ${d.queueTotal} مورد منتظر اقدام`, ` · ${d.queueTotal} ${(d.queueTotal) === 1 ? "item" : "items"} need action`) : ""}</span>
        </div>
        <div className="adb-actions">
          {can("discounts") && <Link href="/admin/discount-codes" className="admin-btn">{tr("+ کد تخفیف", "+ Discount code")}</Link>}
          {can("content") && <Link href="/admin/announcements" className="admin-btn">{tr("+ اطلاعیه", "+ Announcement")}</Link>}
          {can("content") && <Link href="/admin/broadcast" className="admin-btn primary">{tr("پیام همگانی", "Broadcast")}</Link>}
        </div>
        <SegmentedTabs<DashRange> className="adb-range" options={rangeOptions()} active={range} onChange={setRange} ariaLabel={tr("بازه‌ی زمانی", "Date range")} />
      </div>

      {!d ? (
        error ? (
          <div className="adb-err">{error}<button type="button" className="admin-btn" onClick={reload}>{tr("تلاش دوباره", "Try again")}</button></div>
        ) : <DashboardSkeleton />
      ) : (
        <div className="adb" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
          {error && <div className="adb-err">{error}<button type="button" className="admin-btn" onClick={reload}>{tr("تلاش دوباره", "Try again")}</button></div>}

          <div className="adb-kpis" aria-label={tr("شاخص‌ها", "Key metrics")}>
            {d.kpis.totalUsers && <KpiCard label={tr("کل کاربران", "Total users")} k={d.kpis.totalUsers} color="var(--ring-2a)" />}
            {d.kpis.activeUsers && <KpiCard label={tr("کاربران فعال", "Active users")} k={d.kpis.activeUsers} color="var(--accent)" />}
            {d.kpis.revenue && <KpiCard label={tr("درآمد", "Revenue")} k={d.kpis.revenue} color="var(--accent)" />}
            {d.kpis.activeSubs && <KpiCard label={tr("اشتراک فعال", "Active subscriptions")} k={d.kpis.activeSubs} color="var(--ring-2b)" />}
            {d.kpis.churn && <KpiCard label={tr("نرخ ریزش", "Churn rate")} k={d.kpis.churn} invert color="var(--ring-3a)" />}
            {d.kpis.openTickets && <KpiCard label={tr("تیکت باز", "Open tickets")} k={d.kpis.openTickets} invert color="var(--ring-3b)" />}
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
