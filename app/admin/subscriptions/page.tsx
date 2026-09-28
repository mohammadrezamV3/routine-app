"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminTabBar } from "@/components/admin/TabBar";
import { adminFetch } from "@/components/admin/useAdminToast";
import { formatNumber } from "@/lib/adminFormat";

type PlanRow = { plan: { id: string; nameFa: string; market: string; currency: string; priceMonthly: number }; active: number; expired: number; newInRange: number; canceledInRange: number };
type Resp = { planBreakdown: PlanRow[]; renewalsUpgrades: { renewalsInRange: number; upgradesInRange: number; downgradesInRange: number } };

const TABS = [
  { key: "active", label: "اشتراک‌های فعال" },
  { key: "expired", label: "اشتراک‌های منقضی" },
  { key: "renewals", label: "تمدیدها" },
  { key: "upgrades", label: "ارتقاها" },
  { key: "canceled", label: "لغو اشتراک" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function SubscriptionsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "active";
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "active";
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState<string | null>(null);

  // فقط پارامترهای بازه روی داده اثر دارن — عوض‌کردن تب نباید دوباره fetch کنه
  const range = searchParams.get("range") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const sp = new URLSearchParams();
    if (range) sp.set("range", range);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    adminFetch<Resp>(`/api/admin/subscriptions?${sp.toString()}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [range, from, to]);

  function setTab(key: TabKey) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", key);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const totals = data ? data.planBreakdown.reduce((acc, r) => ({
    active: acc.active + r.active, expired: acc.expired + r.expired, newInRange: acc.newInRange + r.newInRange, canceledInRange: acc.canceledInRange + r.canceledInRange,
  }), { active: 0, expired: 0, newInRange: 0, canceledInRange: 0 }) : null;

  return (
    <section>
      <div className="admin-commerce-head">
        <AdminTabBar items={[...TABS]} active={tab} onChange={setTab} />
        <RangePicker />
      </div>

      {error ? (
        <EmptyState message={error} />
      ) : !data || !totals ? (
        <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : (
        <>
          <KpiGrid>
            {tab === "active" && <KpiTile label="مجموع اشتراک‌های فعال" value={formatNumber(totals.active)} index={0} />}
            {tab === "expired" && <KpiTile label="مجموع اشتراک‌های منقضی" value={formatNumber(totals.expired)} index={0} />}
            {tab === "renewals" && <KpiTile label="تمدید در این بازه" value={formatNumber(data.renewalsUpgrades.renewalsInRange)} index={0} />}
            {tab === "upgrades" && (
              <>
                <KpiTile label="ارتقا در این بازه" value={formatNumber(data.renewalsUpgrades.upgradesInRange)} index={0} />
                <KpiTile label="تنزل در این بازه" value={formatNumber(data.renewalsUpgrades.downgradesInRange)} index={1} />
              </>
            )}
            {tab === "canceled" && <KpiTile label="لغو در این بازه" value={formatNumber(totals.canceledInRange)} index={0} />}
          </KpiGrid>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">جزئیات بر اساس پلن</span></div>
            {data.planBreakdown.length === 0 ? <EmptyState message="هنوز پلنی تعریف نشده" /> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>پلن</th><th>بازار</th><th>فعال</th><th>منقضی</th><th>خرید جدید در بازه</th><th>لغوشده در بازه</th></tr></thead>
                  <tbody>
                    {data.planBreakdown.map((row) => (
                      <tr key={row.plan.id}>
                        <td>{row.plan.nameFa}</td>
                        <td>{row.plan.market === "IRAN" ? "ایران" : "بین‌المللی"}</td>
                        <td className={tab === "active" ? "admin-col-focus" : undefined}>{formatNumber(row.active)}</td>
                        <td className={tab === "expired" ? "admin-col-focus" : undefined}>{formatNumber(row.expired)}</td>
                        <td>{formatNumber(row.newInRange)}</td>
                        <td className={tab === "canceled" ? "admin-col-focus" : undefined}>{formatNumber(row.canceledInRange)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-section-hint admin-commerce-foot">
            «تمدید»/«ارتقا» فیلد مستقلی در دیتابیس ندارن — از روی توالی خریدهای هر کاربر (همون پلن دوباره = تمدید، پلن گران‌تر = ارتقا) استنتاج می‌شن.
          </div>
        </>
      )}
    </section>
  );
}

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">در حال بارگذاری…</div>}>
      <SubscriptionsInner />
    </Suspense>
  );
}
