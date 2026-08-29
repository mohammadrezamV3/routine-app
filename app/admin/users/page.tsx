"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { formatDateShort } from "@/lib/adminFormat";

type UserRow = {
  id: string; name: string | null; lastName: string | null; email: string | null; phone: string | null; username: string | null;
  market: string; isSuperAdmin: boolean; isBlocked: boolean; createdAt: string;
  plan: string | null; subscriptionStatus: string | null; subscriptionExpiresAt: string | null; lastActivityAt: string | null;
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "همه کاربران" },
  { key: "new", label: "کاربران جدید" },
  { key: "active", label: "کاربران فعال" },
  { key: "inactive", label: "کاربران غیرفعال" },
  { key: "free", label: "کاربران رایگان" },
  { key: "paid", label: "کاربران پولی" },
  { key: "blocked", label: "مسدودشده" },
];

function UsersInner() {
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

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState<{ users: UserRow[]; total: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams({ filter, page: String(page) });
    if (debouncedSearch.trim()) sp.set("search", debouncedSearch.trim());
    fetch(`/api/admin/users?${sp.toString()}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [filter, page, debouncedSearch]);

  function setFilter(key: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("filter", key);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  async function toggleBlock(user: UserRow) {
    const next = !user.isBlocked;
    if (next && !confirm(`${user.name || user.username || "این کاربر"} مسدود بشه؟`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: next }),
    });
    if (res.ok && data) {
      setData({ ...data, users: data.users.map((u) => (u.id === user.id ? { ...u, isBlocked: next } : u)) });
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <AdminTabBar items={FILTERS} active={filter} onChange={setFilter} />

      <input
        className="admin-input"
        placeholder="جستجو بر اساس نام، ایمیل، شماره یا یوزرنیم…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", maxWidth: 380, marginBottom: 16 }}
      />

      {!data ? (
        <div className="admin-empty">{loading ? "در حال بارگذاری…" : "خطا در دریافت اطلاعات"}</div>
      ) : data.users.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>نام</th><th>ایمیل / شماره</th><th>تاریخ ثبت‌نام</th><th>پلن</th><th>وضعیت</th><th>آخرین فعالیت</th><th>انقضای اشتراک</th><th>اقدام</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td><Link href={`/admin/users/${u.id}`} style={{ color: "var(--adm-text)", fontWeight: 700, textDecoration: "none" }}>{[u.name, u.lastName].filter(Boolean).join(" ") || u.username || "—"}</Link></td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{u.email || u.phone || "—"}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{formatDateShort(u.createdAt)}</td>
                    <td>{u.plan || "—"}</td>
                    <td>
                      {u.isBlocked ? <span className="admin-badge red">مسدود</span> : u.isSuperAdmin ? <span className="admin-badge amber">Owner</span> : <span className="admin-badge green">فعال</span>}
                    </td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{u.lastActivityAt ? formatDateShort(u.lastActivityAt) : "—"}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{u.subscriptionExpiresAt ? formatDateShort(u.subscriptionExpiresAt) : "—"}</td>
                    <td>
                      {!u.isSuperAdmin && (
                        <button type="button" className={`admin-btn${u.isBlocked ? "" : " danger"}`} style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => toggleBlock(u)}>
                          {u.isBlocked ? "رفع مسدودی" : "مسدودکردن"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </section>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="admin-empty">در حال بارگذاری…</div>}>
      <UsersInner />
    </Suspense>
  );
}
