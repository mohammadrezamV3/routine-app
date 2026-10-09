"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n";
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

// توابع (نه ثابت ماژول) تا برچسب‌ها با زبان جاری حل بشن
function seenOpts() {
  return [["", tr("آخرین فعالیت", "Last activity")], ["1d", tr("امروز", "Today")], ["7d", tr("7 روز اخیر", "Last 7 days")], ["30d", tr("30 روز اخیر", "Last 30 days")], ["90d", tr("90 روز اخیر", "Last 90 days")], ["never", tr("هیچ‌وقت", "Never")]];
}
function signupOpts() {
  return [["", tr("ثبت‌نام", "Signed up")], ["7d", tr("7 روز اخیر", "Last 7 days")], ["30d", tr("30 روز اخیر", "Last 30 days")], ["90d", tr("90 روز اخیر", "Last 90 days")], ["365d", tr("یک سال اخیر", "Last year")]];
}

type BulkAction = "block" | "unblock" | "delete" | "restore";
function bulkLabels(): Record<BulkAction, string> {
  return { block: tr("مسدودکردن", "Block"), unblock: tr("رفع مسدودی", "Unblock"), delete: tr("حذف", "Delete"), restore: tr("بازگردانی", "Restore") };
}

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
      if (r.failed.length) toast(tr(`${formatNumber(r.done)} انجام شد، ${formatNumber(r.failed.length)} ناموفق: ${r.failed[0].error}`, `${formatNumber(r.done)} done, ${formatNumber(r.failed.length)} failed: ${r.failed[0].error}`), "err");
      else toast(tr(`${bulkLabels()[action]} برای ${formatNumber(r.done)} کاربر انجام شد`, `${bulkLabels()[action]} applied to ${formatNumber(r.done)} ${(r.done) === 1 ? "user" : "users"}`));
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
          <div className="au-kicker">{tr("کاربران", "Users")}</div>
          <h1 className="au-title">{tr("همه‌ی کاربران", "All users")}</h1>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn" onClick={() => exportCsv()}><Download size={14} /> {tr("خروجی CSV", "Export CSV")}</button>
          {can("users.edit") && <button type="button" className="admin-btn" onClick={() => setDialog("segment")}>{tr("ذخیره به‌عنوان بخش", "Save as segment")}</button>}
        </div>
      </div>

      <AdminTabBar items={tabItems} active={filters.tab} onChange={(k) => setParams({ tab: k === "all" ? null : k })} />
      <div className="au-hint">{tr("«در خطر ریزش»: کاربر پولی که اشتراکش تا 7 روز دیگه تموم می‌شه یا 7 روز و بیشتر فعالیتی نداشته.", "«At risk»: a paid user whose subscription ends within 7 days, or who has had no activity for 7 days or more.")}</div>

      {meta && meta.segments.length > 0 && (
        <div className="au-segments" aria-label={tr("بخش‌های ذخیره‌شده", "Saved segments")}>
          {meta.segments.map((s) => (
            <span key={s.id} className="au-chip au-seg">
              <button type="button" className="au-seg-btn" onClick={() => applySegment(s.filters)}>{s.name}</button>
              {can("users.edit") && <button type="button" className="au-chip-x" aria-label={tr(`حذف بخش ${s.name}`, `Delete segment ${s.name}`)} onClick={() => deleteSegment(s.id)}><X size={11} /></button>}
            </span>
          ))}
        </div>
      )}

      <div className="au-filters">
        <div className="admin-search">
          <Search size={15} />
          <input className="admin-input au-pill" placeholder={tr("نام، شماره، ایمیل یا نام کاربری", "Name, phone, email or username")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={tr("جست‌وجوی کاربران", "Search users")} />
        </div>
        <select className="admin-input au-pill" value={filters.plan} onChange={(e) => setParams({ plan: e.target.value || null })} aria-label={tr("پلن", "Plan")}>
          <option value="">{tr("پلن", "Plan")}</option>
          <option value="none">{tr("بدون پلن", "No plan")}</option>
          {meta?.plans.map((p) => <option key={p.id} value={p.id}>{p.nameFa}</option>)}
        </select>
        <select className="admin-input au-pill" value={filters.seen} onChange={(e) => setParams({ seen: e.target.value || null })} aria-label={tr("آخرین فعالیت", "Last activity")}>
          {seenOpts().map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="admin-input au-pill" value={filters.signup} onChange={(e) => setParams({ signup: e.target.value || null })} aria-label={tr("تاریخ ثبت‌نام", "Signup date")}>
          {signupOpts().map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="admin-input au-pill" value={filters.tag} onChange={(e) => setParams({ tag: e.target.value || null })} aria-label={tr("برچسب", "Tag")}>
          <option value="">{tr("برچسب", "Tag")}</option>
          {meta?.tags.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
        </select>
        {hasFilter && <button type="button" className="admin-btn sm" onClick={() => setParams({ plan: null, seen: null, signup: null, tag: null })}>{tr("پاک‌کردن فیلترها", "Clear filters")}</button>}
      </div>

      {ids.length > 0 && (
        <div className="admin-bulk-bar au-bulk">
          <strong>{tr(`${formatNumber(ids.length)} کاربر انتخاب شده`, `${formatNumber(ids.length)} ${(ids.length) === 1 ? "user" : "users"} selected`)}</strong>
          <span className="au-grow" />
          {!showDeleted && can("users.edit") && <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setDialog("message")}>{tr("پیام", "Message")}</button>}
          {!showDeleted && can("users.access") && <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setDialog("grant")}>{tr("اعطای ماژول", "Grant module")}</button>}
          {!showDeleted && can("users.edit") && <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setDialog("tag")}>{tr("برچسب", "Tag")}</button>}
          {!showDeleted && can("users.edit") && <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setDialog("untag")}>{tr("حذف برچسب", "Remove tag")}</button>}
          <button type="button" className="admin-btn sm" disabled={busy} onClick={() => exportCsv(ids)}>CSV</button>
          {!showDeleted && can("users.edit") && (
            <>
              <button type="button" className="admin-btn sm danger" disabled={busy} onClick={() => setConfirm({ action: "block", ids })}>{tr("مسدودسازی", "Block")}</button>
              <button type="button" className="admin-btn sm" disabled={busy} onClick={() => runBulk("unblock", ids)}>{tr("رفع مسدودی", "Unblock")}</button>
            </>
          )}
          {can("users.delete") && (showDeleted
            ? <button type="button" className="admin-btn sm" disabled={busy} onClick={() => runBulk("restore", ids)}>{tr("بازگردانی", "Restore")}</button>
            : <button type="button" className="admin-btn sm danger" disabled={busy} onClick={() => setConfirm({ action: "delete", ids })}>{tr("حذف", "Delete")}</button>)}
          <button type="button" className="admin-btn sm" disabled={busy} onClick={() => setSelected(new Set())}>{tr("لغو انتخاب", "Clear selection")}</button>
        </div>
      )}

      {!data ? (
        failed ? (
          <div className="admin-empty"><span>{tr("خطا در دریافت اطلاعات", "Couldn't load data")}</span><button type="button" className="admin-btn sm" onClick={load}>{tr("تلاش دوباره", "Try again")}</button></div>
        ) : <div className="admin-empty"><Spinner size={22} /></div>
      ) : (
        <>
          {failed && <div className="admin-form-error admin-inline-error">{tr("به‌روزرسانی لیست ناموفق بود — داده‌ی قبلی نمایش داده می‌شه.", "Couldn't refresh the list — showing the previous data.")}<button type="button" className="admin-btn sm" onClick={load}>{tr("تلاش دوباره", "Try again")}</button></div>}
          {data.capped && <div className="au-hint">{tr("مرتب‌سازی روی 5000 کاربر اول انجام شد.", "Sorted the first 5000 users.")}</div>}
          {rows.length === 0 ? <EmptyState message={filters.search ? tr("کاربری با این جست‌وجو پیدا نشد", "No users match this search") : tr("کاربری پیدا نشد", "No users found")} /> : (
            <>
              <div className={`admin-table-wrap au-table-wrap${loading ? " is-refreshing" : ""}`} aria-busy={loading}>
                <table className="admin-table au-table">
                  <thead>
                    <tr>
                      <th className="admin-check-col"><TickButton shape="square" size={20} checked={allSel} onToggle={() => setSelected(allSel ? new Set() : new Set(rows.map((u) => u.id)))} label={tr("انتخاب همه", "Select all")} /></th>
                      <th><button type="button" className="au-th" onClick={() => toggleSort("name")}>{tr("کاربر", "User")} {sortIcon("name")}</button></th>
                      <th>{tr("پلن", "Plan")}</th>
                      <th>{tr("وضعیت", "Status")}</th>
                      <th><button type="button" className="au-th" onClick={() => toggleSort("ltv")}>{tr("ارزش طول عمر", "Lifetime value")} {sortIcon("ltv")}</button></th>
                      <th><button type="button" className="au-th" onClick={() => toggleSort("newest")}>{tr("ثبت‌نام", "Signed up")} {sortIcon("newest")}</button></th>
                      <th><button type="button" className="au-th" onClick={() => toggleSort("seen")}>{tr("آخرین فعالیت", "Last activity")} {sortIcon("seen")}</button></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id} className={`au-row-tr${selected.has(u.id) ? " is-selected" : ""}${openId === u.id ? " is-open" : ""}`} onClick={() => setParams({ u: u.id }, true)}>
                        <td className="admin-check-col" onClick={(e) => e.stopPropagation()}>
                          <TickButton shape="square" size={20} checked={selected.has(u.id)} label={tr(`انتخاب ${displayName(u)}`, `Select ${displayName(u)}`)}
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
                            {u.atRisk && <span className="au-chip au-chip-warn">{tr("در خطر ریزش", "At risk")}</span>}
                            {u.isAdmin && <span className="au-chip au-chip-warn">{u.isSuperAdmin ? "Owner" : tr("ادمین", "Admin")}</span>}
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
          title={tr(`${bulkLabels()[confirm.action]} ${formatNumber(confirm.ids.length)} کاربر`, `${bulkLabels()[confirm.action]} ${formatNumber(confirm.ids.length)} ${(confirm.ids.length) === 1 ? "user" : "users"}`)}
          message={confirm.action === "delete" ? tr("حساب‌ها غیرفعال و از همه‌ی دستگاه‌ها خارج می‌شن. داده‌ها می‌مونن و از تب «حذف‌شده» قابل بازگردانی‌ان.", "Accounts are deactivated and signed out of all devices. Data is kept and can be restored from the «Deleted» tab.") : tr("کاربران انتخاب‌شده دیگه نمی‌تونن وارد بشن و از همه‌ی دستگاه‌ها خارج می‌شن.", "Selected users can no longer sign in and are signed out of all devices.")}
          confirmLabel={bulkLabels()[confirm.action]} onConfirm={() => runBulk(confirm.action, confirm.ids)} onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}

export function AdminUsersList() {
  return <Suspense fallback={<div className="admin-empty"><Spinner size={22} /></div>}><Inner /></Suspense>;
}
