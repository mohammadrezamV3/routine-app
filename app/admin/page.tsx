"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { MultiLineChart } from "@/components/admin/MultiLineChart";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { useAdminData } from "@/components/admin/useAdminData";
import { formatCurrencyAmount, formatNumber, formatPercent } from "@/lib/adminFormat";
import Link from "next/link";
import { Users, ShieldCheck, Headset, Tag, History, Flag, CalendarClock, Settings, Megaphone } from "lucide-react";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { AdminPermission } from "@/lib/adminPermissions";

const QUICK_LINKS: { label: string; href: string; perm: AdminPermission; icon: React.ReactNode }[] = [
  { label: "کاربران", href: "/admin/users", perm: "users.view", icon: <Users size={18} /> },
  { label: "ادمین‌ها و دسترسی‌ها", href: "/admin/admins", perm: "admins.manage", icon: <ShieldCheck size={18} /> },
  { label: "تیکت‌ها", href: "/admin/support", perm: "support", icon: <Headset size={18} /> },
  { label: "گزارش‌های چت", href: "/admin/chat-reports", perm: "chat", icon: <Flag size={18} /> },
  { label: "کدهای تخفیف", href: "/admin/discount-codes", perm: "discounts", icon: <Tag size={18} /> },
  { label: "اطلاعیه‌ها", href: "/admin/announcements", perm: "content", icon: <Megaphone size={18} /> },
  { label: "تقویم اقتصادی", href: "/admin/economic-calendar", perm: "content", icon: <CalendarClock size={18} /> },
  { label: "لاگ فعالیت", href: "/admin/audit", perm: "audit", icon: <History size={18} /> },
  { label: "تنظیمات", href: "/admin/settings", perm: "settings", icon: <Settings size={18} /> },
];

// میان‌برهای داشبورد — فقط بخش‌هایی که ادمین فعلی بهشون دسترسی داره
function QuickLinks() {
  const { can } = useAdminAccess();
  const links = QUICK_LINKS.filter((l) => can(l.perm));
  if (!links.length) return null;
  return (
    <div className="admin-quick-grid">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="admin-card admin-quick-link">
          <span className="admin-nav-icon">{l.icon}</span>
          <span>{l.label}</span>
        </Link>
      ))}
    </div>
  );
}

const CURRENCY_FA: Record<string, string> = { IRR: "تومان", USD: "دلار" };

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
  const { can } = useAdminAccess();
  if (!can("analytics")) {
    return (
      <section>
        <QuickLinks />
        <div className="admin-section-hint admin-overview-hint">آمار کلی فقط برای ادمین‌هایی با دسترسی «تحلیل‌ها» نمایش داده می‌شه.</div>
      </section>
    );
  }
  return <OverviewStats />;
}

function OverviewStats() {
  const searchParams = useSearchParams();
  const { data, error, loading, reload } = useAdminData<OverviewResponse>(`/api/admin/overview?${searchParams.toString()}`);
  const revenueEntries = data ? Object.entries(data.kpis.revenueByCurrency) : [];

  return (
    <section>
      <QuickLinks />
      <div className="admin-range-bar">
        <RangePicker />
      </div>

      {!data ? (
        error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState />
      ) : (
        <div className={loading ? "admin-refreshing" : undefined} aria-busy={loading}>
          {error && <ErrorState message={error} onRetry={reload} />}
          <KpiGrid>
            <KpiTile label="کاربران کل" value={formatNumber(data.kpis.totalUsers)} index={0} />
            <KpiTile label="کاربران فعال (این بازه)" value={formatNumber(data.kpis.activeUsers)} index={1} />
            <KpiTile label="کاربران جدید" value={formatNumber(data.kpis.newUsers)} deltaPercent={data.kpis.newUsersGrowthPercent} index={2} />
            <KpiTile label="کاربران پولی" value={formatNumber(data.kpis.paidUsers)} index={3} />
            {revenueEntries.length === 0 ? (
              <KpiTile label="درآمد" value="—" index={4} />
            ) : (
              revenueEntries.map(([cur, amt], i) => (
                <KpiTile key={cur} label={`درآمد (${CURRENCY_FA[cur] || cur})`} value={formatCurrencyAmount(amt, cur)} deltaPercent={data.kpis.revenueGrowthPercentByCurrency[cur] ?? null} index={4 + i} />
              ))
            )}
            <KpiTile label="رشد کاربران جدید" value={formatPercent(data.kpis.newUsersGrowthPercent)} index={5 + Math.max(0, revenueEntries.length - 1)} />
          </KpiGrid>

          <div className="admin-chart-card">
            <div className="admin-chart-head">
              <span className="admin-chart-title">رشد کاربران</span>
            </div>
            <MultiLineChart
              data={data.growthSeries.map((p) => ({ bucket: p.bucket, values: { newUsers: p.newUsers, activeUsers: p.activeUsers, paidUsers: p.paidUsers } }))}
              series={[
                { key: "newUsers", label: "کاربران جدید", color: "var(--adm-accent)" },
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
        </div>
      )}
    </section>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OverviewInner />
    </Suspense>
  );
}
