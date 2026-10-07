"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search, X } from "lucide-react";
import { TickButton } from "@/components/TickButton";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { formatCurrencyAmount, formatNumber } from "@/lib/adminFormat";
import { EMPTY_FILTERS, TABS, TAB_LABELS, UsersFilters, sanitizeFilters } from "@/lib/adminUsersView";
import { AdminUserDrawer } from "@/components/AdminUserDrawer";
import { StatusChip, formatAgo } from "@/components/AdminUserProfile";
import { GrantDialog, MessageDialog, SaveSegmentDialog, TagDialog, postBulk } from "@/components/AdminUserDialogs";
import "@/components/admin-users.css";

type Row = {
  id: string; name: string | null; lastName: string | null; email: string | null; phone: string | null; username: string | null;
  avatarUrl: string | null; isAdmin: boolean; isSuperAdmin: boolean; isBlocked: boolean; deletedAt: string | null; createdAt: string;
  plan: string | null; status: string; atRisk: boolean; ltv: { amount: number; currency: string } | null; lastActivityAt: string | null; tags: string[];
};
type Meta = { plans: { id: string; nameFa: string }[]; tags: { tag: string; count: number }[]; segments: { id: string; name: string; filters: unknown }[] };

const SEEN_OPTS = [["", "آخرین فعالیت"], ["1d", "امروز"], ["7d", "7 روز اخیر"], ["30d", "30 روز اخیر"], ["90d", "90 روز اخیر"], ["never", "هیچ‌وقت"]];
const SIGNUP_OPTS = [["", "ثبت‌نام"], ["7d", "7 روز اخیر"], ["30d", "30 روز اخیر"], ["90d", "90 روز اخیر"], ["365d", "یک سال اخیر"]];

type BulkAction = "block" | "unblock" | "delete" | "restore";
const BULK_LABEL: Record<BulkAction, string> = { block: "مسدودکردن", unblock: "رفع مسدودی", delete: "حذف", restore: "بازگردانی" };

function Inner() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const toast = useAdminToast();
  const { can } = useAdminAccess();

  const filters: UsersFilters = sanitizeFilters({
    tab: sp.get("tab") || sp.get("filter") || "all", search: sp.get("search") || "", plan: sp.get("plan") || "",
    seen: sp.get("seen") || "", signup: sp.get("signup") || "", tag: sp.get("tag") || "",
  });
  const sort = sp.get("sort") || "newest";
  const dir = sp.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Math.floor(Number(sp.get("page")) || 1));
  const openId = sp.get("u");

  const [search, setSearch] = useState(filters.search);
  const lastPushed = useRef(filters.search);
  const [data, setData] = useState<{ users: Row[]; total: number; pageSize: number; counts?: Record<string, number>; capped?: boolean } | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<null | "message" | "grant" | "tag" | "untag" | "segment">(null);
  const [confirm, setConfirm] = useState<{ action: BulkAction; ids: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const setParams = useCallback((patch: Record<string, string | null>, replace = false) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null || v === "") q.delete(k); else q.set(k, v); }
    if (!("page" in patch) && !("u" in patch)) q.delete("page");
    q.delete("filter");
    const qs = q.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (replace) router.replace(url, { scroll: false }); else router.push(url, { scroll: false });
  }, [router, pathname, sp]);

  useEffect(() => {
    const q = search.trim();
    if (q === filters.search) return;
    const t = setTimeout(() => { lastPushed.current = q; setParams({ search: q || null }, true); }, 350);
    return () => clearTimeout(t);
  }, [search, filters.search, setParams]);
  useEffect(() => {
    if (filters.search === lastPushed.current) return;
    lastPushed.current = filters.search;
    setSearch(filters.search);
  }, [filters.search]);

  const loadMeta = useCallback(() => {
    fetch("/api/admin/users/meta").then((r) => (r.ok ? r.json() : null)).then((m) => m && setMeta(m)).catch(() => {});
  }, []);
  useEffect(loadMeta, [loadMeta]);

  const qs = new URLSearchParams();
  (Object.keys(filters) as (keyof UsersFilters)[]).forEach((k) => { if (filters[k] && !(k === "tab" && filters.tab === "all")) qs.set(k, filters[k]); });
  const filterKey = qs.toString();

  const load = useCallback(() => {
    const s = ++seq.current;
    setLoading(true);
    const q = new URLSearchParams(filterKey);
    q.set("sort", sort); q.set("dir", dir); q.set("page", String(page)); q.set("counts", "1");
    fetch(`/api/admin/users?${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (s !== seq.current) return; setData(d); setFailed(false); setSelected(new Set()); })
      .catch(() => { if (s === seq.current) setFailed(true); })
      .finally(() => { if (s === seq.current) setLoading(false); });
  }, [filterKey, sort, dir, page]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!data || loading || data.users.length > 0 || page <= 1 || data.total === 0) return;
    setParams({ page: String(Math.max(1, Math.ceil(data.total / data.pageSize))) }, true);
  }, [data, loading, page, setParams]);

  function toggleSort(col: "name" | "ltv" | "seen" | "newest") {
    const cur = sort === col;
    setParams({ sort: col === "newest" && !cur ? null : col, dir: cur ? (dir === "desc" ? "asc" : "desc") : col === "name" ? "asc" : "desc" });
  }
  const sortIcon = (col: string) => (sort !== col ? <ArrowUpDown size={11} /> : dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />);

  async function runBulk(action: BulkAction, ids: string[]) {
    setBusy(true);
    try {
      const r = await postBulk(ids, action, {});
      if (r.failed.length) toast(`${formatNumber(r.done)} انجام شد، ${formatNumber(r.failed.length)} ناموفق: ${r.failed[0].error}`, "err");
      else toast(`${BULK_LABEL[action]} برای ${formatNumber(r.done)} کاربر انجام شد`);
      load();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); setConfirm(null); }
  }

  function exportCsv(ids?: string[]) {
    const q = new URLSearchParams(filterKey);
    if (ids?.length) { q.delete("tab"); q.set("ids", ids.join(",")); }
    window.location.href = `/api/admin/users/export?${q}`;
  }

  async function deleteSegment(id: string) {
    try { await adminFetch(`/api/admin/users/segments?id=${id}`, { method: "DELETE" }); loadMeta(); } catch (e: any) { toast(e.message, "err"); }
  }
  function applySegment(f: unknown) {
    const x = sanitizeFilters(f);
    setParams({ tab: x.tab === "all" ? null : x.tab, search: x.search || null, plan: x.plan || null, seen: x.seen || null, signup: x.signup || null, tag: x.tag || null });
  }

  const rows = data?.users || [];
  const allSel = rows.length > 0 && rows.every((u) => selected.has(u.id));
  const ids = Array.from(selected);
  const showDeleted = filters.tab === "deleted";
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const tabItems = TABS.map((t) => ({ key: t as string, label: `${TAB_LABELS[t]}${data?.counts ? ` ${formatNumber(data.counts[t] ?? 0)}` : ""}` }));
  const hasFilter = !!(filters.plan || filters.seen || filters.signup || filters.tag);

  return (
    <section className="au-list">
      <div className="admin-page-head">
        <div>
          <div className="au-kicker">کاربران</div>
          <h1 className="au-title">همه‌ی کاربران</h1>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn" onClick={() => exportCsv()}><Download size={14} /> خروجی CSV</button>
          {can("users.edit") && <button type="button" className="admin-btn" onClick={() => setDialog("segment")}>ذخیره به‌عنوان بخش</button>}
        </div>
      </div>

      <AdminTabBar items={tabItems} active={filters.tab} onChange={(k) => setParams({ tab: k === "all" ? null : k })} />
      <div className="au-hint">«در خطر ریزش»: کاربر پولی که اشتراکش تا 7 روز دیگه تموم می‌شه یا 7 روز و بیشتر فعالیتی نداشته.</div>

      {meta && meta.segments.length > 0 && (
        <div className="au-segments" aria-label="بخش‌های ذخیره‌شده">
          {meta.segments.map((s) => (
            <span key={s.id} className="au-chip au-seg">
              <button type="button" className="au-seg-btn" onClick={() => applySegment(s.filters)}>{s.name}</button>
              {can("users.edit") && <button type="button" className="au-chip-x" aria-label={`حذف بخش ${s.name}`} onClick={() => deleteSegment(s.id)}><X size={11} /></button>}
            </span>
          ))}
        </div>
      )}

      <div className="au-filters">
        <div className="admin-search">
          <Search size={15} />
          <input className="admin-input au-pill" placeholder="نام، شماره، ایمیل یا نام کاربری" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="جست‌وجوی کاربران" />
        </div>
        <select className="admin-input au-pill" value={filters.plan} onChange={(e) => setParams({ plan: e.target.value || null })} aria-label="پلن">
          <option value="">پلن</option>
          <option value="none">بدون پلن</option>
          {meta?.plans.map((p) => <option key={p.id} value={p.id}>{p.nameFa}</option>)}
        </select>
        <select className="admin-input au-pill" value={filters.seen} onChange={(e) => setParams({ seen: e.target.value || null })} aria-label="آخرین فعالیت">
          {SEEN_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="admin-input au-pill" value={filters.signup} onChange={(e) => setParams({ signup: e.target.value || null })} aria-label="تاریخ ثبت‌نام">
          {SIGNUP_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="admin-input au-pill" value={filters.tag} onChange={(e) => setParams({ tag: e.target.value || null })} aria-label="برچسب">
          <option value="">برچسب</option>
          {meta?.tags.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
        </select>
        {hasFilter && <button type="button" className="admin-btn sm" onClick={() => setParams({ plan: null, seen: null, signup: null, tag: null })}>پاک‌کردن فیلترها</button>}
      </div>

      {ids.length > 0 && (
        <div className="admin-bulk-bar au-bulk">
          <strong>{formatNumber(ids.length)} کاربر انتخاب شده</strong>
          <span className="au-grow" />
          {!showDeleted && can("users.edit") && <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setDialog("message")}>پیام</button>}
          {!showDeleted && can("users.access") && <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setDialog("grant")}>اعطای ماژول</button>}
          {!showDeleted && can("users.edit") && <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setDialog("tag")}>برچسب</button>}
          {!showDeleted && can("users.edit") && <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setDialog("untag")}>حذف برچسب</button>}
          <button type="button" className="admin-btn sm" disabled={busy} onClick={() => exportCsv(ids)}>CSV</button>
          {!showDeleted && can("users.edit") && (
            <>
              <button type="button" className="admin-btn sm danger" disabled={busy} onClick={() => setConfirm({ action: "block", ids })}>مسدودسازی</button>
              <button type="button" className="admin-btn sm" disabled={busy} onClick={() => runBulk("unblock", ids)}>رفع مسدودی</button>
            </>
          )}
          {can("users.delete") && (showDeleted
            ? <button type="button" className="admin-btn sm" disabled={busy} onClick={() => runBulk("restore", ids)}>بازگردانی</button>
            : <button type="button" className="admin-btn sm danger" disabled={busy} onClick={() => setConfirm({ action: "delete", ids })}>حذف</button>)}
          <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setSelected(new Set())}>لغو انتخاب</button>
        </div>
      )}

      {!data ? (
        failed ? (
          <div className="admin-empty"><span>خطا در دریافت اطلاعات</span><button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button></div>
        ) : <div className="admin-empty"><Spinner size={22} /></div>
      ) : (
        <>
          {failed && <div className="admin-form-error admin-inline-error">به‌روزرسانی لیست ناموفق بود — داده‌ی قبلی نمایش داده می‌شه.<button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button></div>}
          {data.capped && <div className="au-hint">مرتب‌سازی روی 5000 کاربر اول انجام شد.</div>}
          {rows.length === 0 ? <EmptyState message={filters.search ? "کاربری با این جست‌وجو پیدا نشد" : "کاربری پیدا نشد"} /> : (
            <>
              <div className={`admin-table-wrap au-table-wrap${loading ? " is-refreshing" : ""}`} aria-busy={loading}>
                <table className="admin-table au-table">
                  <thead>
                    <tr>
                      <th className="admin-check-col"><TickButton shape="square" size={20} checked={allSel} onToggle={() => setSelected(allSel ? new Set() : new Set(rows.map((u) => u.id)))} label="انتخاب همه" /></th>
                      <th><button type="button" className="au-th" onClick={() => toggleSort("name")}>کاربر {sortIcon("name")}</button></th>
                      <th>پلن</th>
                      <th>وضعیت</th>
                      <th><button type="button" className="au-th" onClick={() => toggleSort("ltv")}>ارزش طول عمر {sortIcon("ltv")}</button></th>
                      <th><button type="button" className="au-th" onClick={() => toggleSort("newest")}>ثبت‌نام {sortIcon("newest")}</button></th>
                      <th><button type="button" className="au-th" onClick={() => toggleSort("seen")}>آخرین فعالیت {sortIcon("seen")}</button></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id} className={`au-row-tr${selected.has(u.id) ? " is-selected" : ""}${openId === u.id ? " is-open" : ""}`} onClick={() => setParams({ u: u.id }, true)}>
                        <td className="admin-check-col" onClick={(e) => e.stopPropagation()}>
                          <TickButton shape="square" size={20} checked={selected.has(u.id)} label={`انتخاب ${displayName(u)}`}
                            onToggle={() => setSelected((s) => { const n = new Set(s); if (n.has(u.id)) n.delete(u.id); else n.add(u.id); return n; })} />
                        </td>
                        <td>
                          <Link href={`/admin/users/${u.id}`} className="admin-user-cell" onClick={(e) => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); e.stopPropagation(); setParams({ u: u.id }, true); } }}>
                            <UserAvatar user={u} size={34} />
                            <span>
                              <span className="admin-user-cell-name">{displayName(u)}</span>
                              {u.username && <span className="admin-user-cell-sub admin-ltr">@{u.username}</span>}
                            </span>
                          </Link>
                          {u.tags.length > 0 && <span className="au-tags-inline">{u.tags.slice(0, 3).map((t) => <span key={t} className="au-chip">{t}</span>)}</span>}
                        </td>
                        <td className="au-plan">{u.plan || <span className="admin-muted">—</span>}</td>
                        <td>
                          <span className="admin-badge-row">
                            <StatusChip status={u.status} />
                            {u.atRisk && <span className="au-chip au-chip-warn">در خطر ریزش</span>}
                            {u.isAdmin && <span className="au-chip au-chip-warn">{u.isSuperAdmin ? "Owner" : "ادمین"}</span>}
                          </span>
                        </td>
                        <td className="admin-ltr">{u.ltv && u.ltv.amount > 0 ? formatCurrencyAmount(u.ltv.amount, u.ltv.currency) : <span className="admin-muted">0</span>}</td>
                        <td className="au-muted-cell">{formatAgo(u.createdAt)}</td>
                        <td className="au-muted-cell">{formatAgo(u.lastActivityAt)}</td>
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

      {openId && <AdminUserDrawer id={openId} onClose={() => setParams({ u: null }, true)} onChanged={() => { load(); loadMeta(); }} />}

      {dialog === "message" && <MessageDialog ids={ids} onClose={() => setDialog(null)} onDone={load} />}
      {dialog === "grant" && <GrantDialog ids={ids} onClose={() => setDialog(null)} onDone={load} />}
      {(dialog === "tag" || dialog === "untag") && <TagDialog ids={ids} mode={dialog} suggestions={meta?.tags.map((t) => t.tag)} onClose={() => setDialog(null)} onDone={() => { load(); loadMeta(); }} />}
      {dialog === "segment" && <SaveSegmentDialog filters={filters} onClose={() => setDialog(null)} onDone={loadMeta} />}
      {confirm && (
        <ConfirmModal
          title={`${BULK_LABEL[confirm.action]} ${formatNumber(confirm.ids.length)} کاربر`}
          message={confirm.action === "delete" ? "حساب‌ها غیرفعال و از همه‌ی دستگاه‌ها خارج می‌شن. داده‌ها می‌مونن و از تب «حذف‌شده» قابل بازگردانی‌ان." : "کاربران انتخاب‌شده دیگه نمی‌تونن وارد بشن و از همه‌ی دستگاه‌ها خارج می‌شن."}
          confirmLabel={BULK_LABEL[confirm.action]} onConfirm={() => runBulk(confirm.action, confirm.ids)} onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}

export function AdminUsersList() {
  return <Suspense fallback={<div className="admin-empty"><Spinner size={22} /></div>}><Inner /></Suspense>;
}
