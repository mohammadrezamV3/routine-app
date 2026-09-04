"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { formatCurrencyAmount, formatDateShort } from "@/lib/adminFormat";

type Tx = {
  id: string; amount: number; currency: string; provider: string; providerRef: string | null;
  status: string; paidAt: string | null; refundedAt: string | null; createdAt: string;
  user: { id: string; name: string | null; lastName: string | null; phone: string | null; email: string | null };
  plan: string;
};

const FILTERS = [
  { key: "all", label: "همه" },
  { key: "paid", label: "موفق" },
  { key: "refunded", label: "بازپرداخت‌شده" },
];

function TransactionsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  const page = Number(searchParams.get("page")) || 1;
  function setPage(next: number) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("page", String(next));
    router.push(`${pathname}?${sp.toString()}`);
  }
  const [data, setData] = useState<{ transactions: Tx[]; total: number; pageSize: number } | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams({ filter, page: String(page) });
    fetch(`/api/admin/transactions?${sp.toString()}`).then((r) => r.json()).then(setData);
  }, [filter, page]);

  function setFilter(key: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("filter", key);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <AdminTabBar items={FILTERS} active={filter} onChange={setFilter} />

      {!data ? (
        <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : data.transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>کاربر</th><th>پلن</th><th>مبلغ</th><th>تاریخ</th><th>وضعیت</th><th>شناسه تراکنش</th></tr></thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{[t.user.name, t.user.lastName].filter(Boolean).join(" ") || t.user.phone || t.user.email || "—"}</td>
                    <td>{t.plan}</td>
                    <td>{formatCurrencyAmount(t.amount, t.currency)}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{formatDateShort(t.paidAt || t.createdAt)}</td>
                    <td>{t.status === "refunded" ? <span className="admin-badge red">بازپرداخت‌شده</span> : <span className="admin-badge green">موفق</span>}</td>
                    <td className="mono" style={{ direction: "ltr", textAlign: "right", fontSize: 11 }}>{t.providerRef || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />

          <div className="admin-section-hint">
            «ناموفق»/«در انتظار» توی این جدول نمایش داده نمی‌شن چون درگاه فعلی فقط برای پرداخت‌های تأییدشده ردیف Payment می‌سازه — تلاش‌های ناموفق را در بخش «خطاها» می‌بینید.
          </div>
        </>
      )}
    </section>
  );
}

export default function AdminTransactionsPage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">در حال بارگذاری…</div>}>
      <TransactionsInner />
    </Suspense>
  );
}
