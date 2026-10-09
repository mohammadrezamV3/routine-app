"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminTabBar } from "@/components/admin/TabBar";
import { adminFetch } from "@/components/admin/useAdminToast";
import { formatNumber } from "@/lib/adminFormat";
import { pick, tr, type Localized } from "@/lib/i18n";

type PlanRow = { plan: { id: string; nameFa: string; nameEn?: string | null; market: string; currency: string; priceMonthly: number };active: number; expired: number; newInRange: number; canceledInRange: number };
type Resp = { planBreakdown: PlanRow[]; renewalsUpgrades: { renewalsInRange: number; upgradesInRange: number; downgradesInRange: number } };

const TABS = [
  { key: "active", label: { fa: "اشتراک‌های فعال", en: "Active subscriptions" } },
  { key: "expired", label: { fa: "اشتراک‌های منقضی", en: "Expired subscriptions" } },
  { key: "renewals", label: { fa: "تمدیدها", en: "Renewals" } },
  { key: "upgrades", label: { fa: "ارتقاها", en: "Upgrades" } },
  { key: "canceled", label: { fa: "لغو اشتراک", en: "Cancellations" } },
] as const satisfies readonly { key: string; label: Localized }[];
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
        <AdminTabBar items={TABS.map((t) => ({ key: t.key, label: pick(t.label) }))} active={tab} onChange={setTab} />
        <RangePicker />
      </div>

      {error ? (
        <EmptyState message={error} />
      ) : !data || !totals ? (
        <div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
      ) : (
        <>
          <KpiGrid>
            {tab === "active" && <KpiTile label={tr("مجموع اشتراک‌های فعال", "Total active subscriptions")} value={formatNumber(totals.active)} index={0} />}
            {tab === "expired" && <KpiTile label={tr("مجموع اشتراک‌های منقضی", "Total expired subscriptions")} value={formatNumber(totals.expired)} index={0} />}
            {tab === "renewals" && <KpiTile label={tr("تمدید در این بازه", "Renewals in this period")} value={formatNumber(data.renewalsUpgrades.renewalsInRange)} index={0} />}
            {tab === "upgrades" && (
              <>
                <KpiTile label={tr("ارتقا در این بازه", "Upgrades in this period")} value={formatNumber(data.renewalsUpgrades.upgradesInRange)} index={0} />
                <KpiTile label={tr("تنزل در این بازه", "Downgrades in this period")} value={formatNumber(data.renewalsUpgrades.downgradesInRange)} index={1} />
              </>
            )}
            {tab === "canceled" && <KpiTile label={tr("لغو در این بازه", "Cancellations in this period")} value={formatNumber(totals.canceledInRange)} index={0} />}
          </KpiGrid>

          <div className="admin-chart-card">
            <div className="admin-chart-head"><span className="admin-chart-title">{tr("جزئیات بر اساس پلن", "Details by plan")}</span></div>
            {data.planBreakdown.length === 0 ? <EmptyState message={tr("هنوز پلنی تعریف نشده", "No plans defined yet")} /> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>{tr("پلن", "Plan")}</th><th>{tr("بازار", "Market")}</th><th>{tr("فعال", "Active")}</th><th>{tr("منقضی", "Expired")}</th><th>{tr("خرید جدید در بازه", "New purchases in period")}</th><th>{tr("لغوشده در بازه", "Canceled in period")}</th></tr></thead>
                  <tbody>
                    {data.planBreakdown.map((row) => (
                      <tr key={row.plan.id}>
                        <td>{tr(row.plan.nameFa, row.plan.nameEn || row.plan.nameFa)}</td>
                        <td>{row.plan.market === "IRAN" ? tr("ایران", "Iran") : tr("بین‌المللی", "International")}</td>
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
            {tr(
              "«تمدید»/«ارتقا» فیلد مستقلی در دیتابیس ندارن — از روی توالی خریدهای هر کاربر (همون پلن دوباره = تمدید، پلن گران‌تر = ارتقا) استنتاج می‌شن.",
              "Renewals and upgrades have no separate field in the database. They're inferred from each user's purchase sequence (same plan again = renewal, pricier plan = upgrade).",
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>}>
      <SubscriptionsInner />
    </Suspense>
  );
}
