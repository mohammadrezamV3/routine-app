"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Download, Search, ShieldCheck, Ban, Trash2, RotateCcw, Eye } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { formatDateShort, formatNumber } from "@/lib/adminFormat";

type UserRow = {
  id: string; name: string | null; lastName: string | null; email: string | null; phone: string | null; username: string | null;
  avatarUrl: string | null; market: string; isSuperAdmin: boolean; isAdmin: boolean; isBlocked: boolean; deletedAt: string | null; createdAt: string;
  plan: string | null; subscriptionStatus: string | null; subscriptionExpiresAt: string | null; lastActivityAt: string | null;
};

const FILTERS = [
  { key: "all", label: "همه" },
  { key: "new", label: "جدید (7 روز)" },
  { key: "active", label: "فعال" },
  { key: "inactive", label: "غیرفعال" },
  { key: "free", label: "رایگان" },
  { key: "paid", label: "پولی" },
  { key: "admins", label: "ادمین‌ها" },
  { key: "blocked", label: "مسدود" },
  { key: "deleted", label: "حذف‌شده" },
];

type BulkAction = "block" | "unblock" | "delete" | "restore";
const BULK_LABEL: Record<BulkAction, string> = { block: "مسدودکردن", unblock: "رفع مسدودی", delete: "حذف", restore: "بازگردانی" };

function StatusBadges({ u }: { u: UserRow }) {
  return (
    <span className="admin-badge-row">
      {u.deletedAt ? <span className="admin-badge red">حذف‌شده</span>
        : u.isBlocked ? <span className="admin-badge red">مسدود</span>
        : <span className="admin-badge green">فعال</span>}
      {u.isSuperAdmin ? <span className="admin-badge amber">Owner</span> : u.isAdmin ? <span className="admin-badge amber">ادمین</span> : null}
    </span>
  );
}

function UsersInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const { can } = useAdminAccess();
  const filter = searchParams.get("filter") || "all";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));
  // جست‌وجو هم توی URL می‌شینه (مثلِ فیلتر/مرتب‌سازی) تا با برگشت از صفحه‌ی
  // جزئیات از دست نره و — مهم‌تر — عوض‌شدنش صفحه رو به ۱ برگردونه.
  const urlSearch = (searchParams.get("search") || "").trim();

  const [search, setSearch] = useState(urlSearch);
  const lastPushedSearch = useRef(urlSearch);
  const [data, setData] = useState<{ users: UserRow[]; total: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ action: BulkAction; ids: string[] } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const reqSeq = useRef(0);

  const setParams = useCallback((patch: Record<string, string | null>, replace = false) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") sp.delete(key); else sp.set(key, value);
    }
    if (!("page" in patch)) sp.delete("page");
    const qs = sp.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (replace) router.replace(url, { scroll: false }); else router.push(url, { scroll: false });
  }, [router, pathname, searchParams]);

  // تایپ → بعد از مکث، URL (با replace تا تاریخچه پر نشه)
  useEffect(() => {
    const q = search.trim();
    if (q === urlSearch) return;
    const t = setTimeout(() => { lastPushedSearch.current = q; setParams({ search: q || null }, true); }, 350);
    return () => clearTimeout(t);
  }, [search, urlSearch, setParams]);

  // URL از بیرون عوض شد (دکمه‌ی back) → اینپوت هم‌گام؛ ولی نه وقتی خودمون
  // همین مقدار رو فرستادیم (وگرنه حروفی که وسطِ ناوبری تایپ شدن پاک می‌شدن)
  useEffect(() => {
    if (urlSearch === lastPushedSearch.current) return;
    lastPushedSearch.current = urlSearch;
    setSearch(urlSearch);
  }, [urlSearch]);

  const load = useCallback(() => {
    const seq = ++reqSeq.current;
    setLoading(true);
    const sp = new URLSearchParams({ filter, sort, page: String(page) });
    if (urlSearch) sp.set("search", urlSearch);
    fetch(`/api/admin/users?${sp.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        // پاسخِ یک درخواستِ قدیمی‌تر (فیلتر/جست‌وجوی قبلی) نباید نتیجه‌ی جدید رو بپوشونه
        if (seq !== reqSeq.current) return;
        setData(d);
        setFailed(false);
        setSelected(new Set());
      })
      .catch(() => { if (seq === reqSeq.current) setFailed(true); })
      .finally(() => { if (seq === reqSeq.current) setLoading(false); });
  }, [filter, sort, page, urlSearch]);

  useEffect(load, [load]);

  // بعد از حذفِ گروهی ممکنه صفحه‌ی فعلی از آخرین صفحه جلوتر بمونه
  useEffect(() => {
    if (!data || loading || data.users.length > 0 || page <= 1 || data.total === 0) return;
    setParams({ page: String(Math.max(1, Math.ceil(data.total / data.pageSize))) }, true);
  }, [data, loading, page, setParams]);

  async function runBulk(action: BulkAction, ids: string[]) {
    setBulkBusy(true);
    try {
      const r = await adminFetch<{ done: number; failed: { id: string; error: string }[] }>("/api/admin/users/bulk", { method: "POST", json: { action, ids } });
      if (r.failed.length) toast(`${formatNumber(r.done)} انجام شد، ${formatNumber(r.failed.length)} ناموفق: ${r.failed[0].error}`, "err");
      else toast(`${BULK_LABEL[action]} برای ${formatNumber(r.done)} کاربر انجام شد`);
      load();
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBulkBusy(false);
      setConfirm(null);
    }
  }

  function exportCsv() {
    const sp = new URLSearchParams({ filter });
    if (urlSearch) sp.set("search", urlSearch);
    window.location.href = `/api/admin/users/export?${sp.toString()}`;
  }

  const rows = data?.users || [];
  const allSelected = rows.length > 0 && rows.every((u) => selected.has(u.id));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const selIds = Array.from(selected);
  const showDeleted = filter === "deleted";

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">مدیریت کاربران</div>
          <div className="admin-section-hint admin-page-sub">
            {data ? `${formatNumber(data.total)} کاربر` : "…"} — جست‌وجو با نام، ایمیل، شماره، یوزرنیم یا آیدی
          </div>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn" onClick={exportCsv}><Download size={14} /> خروجی CSV</button>
          {can("admins.manage") && <Link href="/admin/admins" className="admin-btn primary"><ShieldCheck size={14} /> مدیریت ادمین‌ها</Link>}
        </div>
      </div>

      <AdminTabBar items={FILTERS} active={filter} onChange={(k) => setParams({ filter: k === "all" ? null : k })} />

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={15} />
          <input
            className="admin-input" placeholder="جست‌وجو…" value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label="جست‌وجوی کاربران"
          />
        </div>
        <select className="admin-input admin-sort-select" value={sort} onChange={(e) => setParams({ sort: e.target.value === "newest" ? null : e.target.value })} aria-label="مرتب‌سازی">
          <option value="newest">جدیدترین</option>
          <option value="oldest">قدیمی‌ترین</option>
          <option value="name">نام</option>
        </select>
      </div>

      {selIds.length > 0 && (
        <div className="admin-bulk-bar">
          <span className="admin-bulk-count">{formatNumber(selIds.length)} انتخاب‌شده</span>
          {!showDeleted && can("users.edit") && (
            <>
              <button type="button" className="admin-btn sm danger" disabled={bulkBusy} onClick={() => setConfirm({ action: "block", ids: selIds })}><Ban size={13} /> مسدود</button>
              <button type="button" className="admin-btn sm" disabled={bulkBusy} onClick={() => runBulk("unblock", selIds)}>رفع مسدودی</button>
            </>
          )}
          {can("users.delete") && (showDeleted
            ? <button type="button" className="admin-btn sm" disabled={bulkBusy} onClick={() => runBulk("restore", selIds)}><RotateCcw size={13} /> بازگردانی</button>
            : <button type="button" className="admin-btn sm danger" disabled={bulkBusy} onClick={() => setConfirm({ action: "delete", ids: selIds })}><Trash2 size={13} /> حذف</button>)}
          <button type="button" className="admin-btn sm" disabled={bulkBusy} onClick={() => setSelected(new Set())}>لغو انتخاب</button>
        </div>
      )}

      {!data ? (
        failed ? (
          <div className="admin-empty">
            <span>خطا در دریافت اطلاعات</span>
            <button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button>
          </div>
        ) : <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : (
        <>
          {failed && (
            <div className="admin-form-error admin-inline-error">
              به‌روزرسانی لیست ناموفق بود — داده‌ی قبلی نمایش داده می‌شه.
              <button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button>
            </div>
          )}
          {rows.length === 0 ? (
            <EmptyState message={urlSearch ? "کاربری با این جست‌وجو پیدا نشد" : "کاربری پیدا نشد"} />
          ) : (
            <>
              <div className={`admin-table-wrap${loading ? " is-refreshing" : ""}`} aria-busy={loading}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="admin-check-col">
                        <input type="checkbox" className="admin-check" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((u) => u.id)))} aria-label="انتخاب همه" />
                      </th>
                      <th>کاربر</th><th>ایمیل / شماره</th><th>پلن</th><th>وضعیت</th><th>ثبت‌نام</th><th>آخرین ورود</th><th aria-label="جزئیات" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id} className={selected.has(u.id) ? "is-selected" : undefined}>
                        <td className="admin-check-col">
                          <input
                            type="checkbox" className="admin-check" checked={selected.has(u.id)} aria-label={`انتخاب ${displayName(u)}`}
                            onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(u.id)) n.delete(u.id); else n.add(u.id); return n; })}
                          />
                        </td>
                        <td>
                          <Link href={`/admin/users/${u.id}`} className="admin-user-cell">
                            <UserAvatar user={u} size={32} />
                            <span>
                              <span className="admin-user-cell-name">{displayName(u)}</span>
                              {u.username && <span className="admin-user-cell-sub admin-ltr">@{u.username}</span>}
                            </span>
                          </Link>
                        </td>
                        <td className="admin-ltr">{u.email || u.phone || "—"}</td>
                        <td>{u.plan || <span className="admin-muted">رایگان</span>}</td>
                        <td><StatusBadges u={u} /></td>
                        <td className="admin-ltr">{formatDateShort(u.createdAt)}</td>
                        <td className="admin-ltr">{u.lastActivityAt ? formatDateShort(u.lastActivityAt) : "—"}</td>
                        <td>
                          <Link href={`/admin/users/${u.id}`} className="admin-icon-btn" aria-label="جزئیات"><Eye size={15} /></Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminPagination page={page} totalPages={totalPages} onChange={(p) => setParams({ page: p > 1 ? String(p) : null })} />
            </>
          )}
        </>
      )}

      {confirm && (
        <ConfirmModal
          title={`${BULK_LABEL[confirm.action]} ${formatNumber(confirm.ids.length)} کاربر`}
          message={confirm.action === "delete"
            ? "حساب‌ها غیرفعال و از همه‌ی دستگاه‌ها خارج می‌شن. داده‌ها می‌مونن و از تب «حذف‌شده» قابل بازگردانی‌ان."
            : "کاربران انتخاب‌شده دیگه نمی‌تونن وارد بشن و از همه‌ی دستگاه‌ها خارج می‌شن."}
          confirmLabel={BULK_LABEL[confirm.action]}
          onConfirm={() => runBulk(confirm.action, confirm.ids)}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">در حال بارگذاری…</div>}>
      <UsersInner />
    </Suspense>
  );
}
