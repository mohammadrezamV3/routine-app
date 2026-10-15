"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { adminFetch } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { formatCurrencyAmount, formatDateShort, formatNumber } from "@/lib/adminFormat";
import { pick, tr, type Localized } from "@/lib/i18n";

type Tx = {
  id: string; amount: number; currency: string; provider: string; providerRef: string | null;
  status: "paid" | "refunded" | "pending"; paidAt: string | null; refundedAt: string | null; createdAt: string;
  user: { id: string; name: string | null; lastName: string | null; phone: string | null; email: string | null };
  plan: string;
};
type Resp = { transactions: Tx[]; total: number; page: number; pageSize: number };

const FILTERS = [
  { key: "all", label: { fa: "همه", en: "All" } },
  { key: "paid", label: { fa: "موفق", en: "Successful" } },
  { key: "refunded", label: { fa: "بازپرداخت‌شده", en: "Refunded" } },
] as const satisfies readonly { key: string; label: Localized }[];
type FilterKey = (typeof FILTERS)[number]["key"];

function userLabel(u: Tx["user"]) {
  return [u.name, u.lastName].filter(Boolean).join(" ") || u.phone || u.email || "—";
}

function StatusBadge({ status }: { status: Tx["status"] }) {
  if (status === "refunded") return <span className="admin-badge red">{tr("بازپرداخت‌شده", "Refunded")}</span>;
  if (status === "pending") return <span className="admin-badge amber">{tr("در انتظار", "Pending")}</span>;
  return <span className="admin-badge green">{tr("موفق", "Successful")}</span>;
}

function TransactionsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can } = useAdminAccess();
  const canViewUsers = can("users.view");
  const filterParam = searchParams.get("filter") || "all";
  const filter: FilterKey = FILTERS.some((f) => f.key === filterParam) ? (filterParam as FilterKey) : "all";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams({ filter, page: String(page) });
    adminFetch<Resp>(`/api/admin/transactions?${sp.toString()}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, page]);

  function pushParams(mut: (sp: URLSearchParams) => void) {
    const sp = new URLSearchParams(searchParams.toString());
    mut(sp);
    router.push(`${pathname}?${sp.toString()}`);
  }
  const setPage = (next: number) => pushParams((sp) => sp.set("page", String(next)));
  const setFilter = (key: FilterKey) => pushParams((sp) => { sp.set("filter", key); sp.delete("page"); });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <div className="admin-commerce-head">
        <AdminTabBar items={FILTERS.map((f) => ({ key: f.key, label: pick(f.label) }))} active={filter} onChange={setFilter} />
        {data && (
          <span className="admin-commerce-count">
            {tr(`${formatNumber(data.total)} تراکنش`, `${formatNumber(data.total)} ${data.total === 1 ? "transaction" : "transactions"}`)}
          </span>
        )}
      </div>

      {error ? (
        <EmptyState message={error} />
      ) : !data ? (
        <div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
      ) : data.transactions.length === 0 ? (
        <EmptyState message={page > 1 ? tr("این صفحه خالیه — به صفحه‌ی اول برگرد", "This page is empty. Go back to the first page.") : tr("تراکنشی با این فیلتر پیدا نشد", "No transactions match this filter")} />
      ) : (
        <>
          <div className={`admin-table-wrap${loading ? " is-refreshing" : ""}`} aria-busy={loading}>
            <table className="admin-table">
              <thead><tr><th>{tr("کاربر", "User")}</th><th>{tr("پلن", "Plan")}</th><th>{tr("مبلغ", "Amount")}</th><th>{tr("تاریخ", "Date")}</th><th>{tr("وضعیت", "Status")}</th><th>{tr("شناسه تراکنش", "Transaction ID")}</th></tr></thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {canViewUsers ? (
                        <Link href={`/admin/users/${t.user.id}`} className="admin-link">{userLabel(t.user)}</Link>
                      ) : userLabel(t.user)}
                    </td>
                    <td>{t.plan}</td>
                    <td className="admin-ltr">{formatCurrencyAmount(t.amount, t.currency)}</td>
                    <td className="admin-ltr">{formatDateShort(t.paidAt || t.createdAt)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="mono admin-ltr admin-tx-ref">{t.providerRef || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <div className="admin-section-hint admin-commerce-foot">
        {tr(
          "تلاش‌های ناموفق توی این جدول نمایش داده نمی‌شن چون درگاه فعلی فقط برای پرداخت‌های تاییدشده ردیف Payment می‌سازه — تلاش‌های ناموفق را در بخش «خطاها» می‌بینید.",
          "Failed attempts aren't shown in this table, because the current gateway only creates a Payment row for confirmed payments. You can see failed attempts under Errors.",
        )}
      </div>
    </section>
  );
}

export default function AdminTransactionsPage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>}>
      <TransactionsInner />
    </Suspense>
  );
}
