"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Eye, MessageSquareText, Flag, Search } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { formatDateShort, formatNumber } from "@/lib/adminFormat";
import { MENTOR_CATEGORY_META, VERIFICATION_LABELS, isMentorCategory } from "@/lib/mentorCategories";

type VStatus = keyof typeof VERIFICATION_LABELS;
type MentorRow = {
  profileId: string;
  user: { id: string; name: string | null; lastName: string | null; username: string | null; avatarUrl: string | null; isBlocked: boolean };
  categories: string[]; published: boolean; identityStatus: VStatus;
  credentials: { category: string; status: VStatus }[];
  pendingCount: number; suspendedAt: string | null; ratingAvg: number; ratingCount: number; students: number; createdAt: string;
};
type Data = { mentors: MentorRow[]; total: number; pageSize: number; counts: { pending: number; suspended: number; all: number } };

type Tab = "pending" | "all" | "suspended";
const TABS: Tab[] = ["pending", "all", "suspended"];
const TAB_LABELS: Record<Tab, string> = { pending: "صف احراز هویت", all: "همه منتورها", suspended: "تعلیق‌شده" };

const V_BADGE: Record<VStatus, "green" | "red" | "amber" | "gray"> = { VERIFIED: "green", REJECTED: "red", PENDING: "amber", NOT_PROVIDED: "gray" };

function categoryLabel(c: string) {
  return isMentorCategory(c) ? MENTOR_CATEGORY_META[c].label : c;
}

function MentorsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab;
  const tab: Tab = TABS.includes(tabParam) ? tabParam : "pending";
  const page = Number(searchParams.get("page")) || 1;
  const q = searchParams.get("q") || "";

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [debounced, setDebounced] = useState(search.trim());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") sp.delete(key); else sp.set(key, value);
    if (key !== "page") sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // جست‌وجوی جدید → برگشت به صفحه‌ی ۱ (از طریقِ URL تا تب/صفحه قابل‌اشتراک بمونه)
  useEffect(() => {
    if (debounced.trim() !== q) setParam("q", debounced.trim() || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    const sp = new URLSearchParams({ tab, page: String(page) });
    if (q) sp.set("q", q);
    fetch(`/api/admin/mentors?${sp.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => setData(d))
      .catch(() => { setFailed(true); setData(null); })
      .finally(() => setLoading(false));
  }, [tab, page, q]);

  useEffect(load, [load]);

  const rows = data?.mentors || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const tabItems = TABS.map((t) => ({
    key: t,
    label: data?.counts && data.counts[t] ? `${TAB_LABELS[t]} (${formatNumber(data.counts[t])})` : TAB_LABELS[t],
  }));

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">منتورها</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            {data ? `${formatNumber(data.total)} منتور` : "…"} — بررسی مدارک هویت و تخصص، تعلیق منتوری
          </div>
        </div>
        <div className="admin-head-actions">
          <Link href="/admin/mentors/reviews" className="admin-btn"><MessageSquareText size={14} /> نظرات</Link>
          <Link href="/admin/mentors/reports" className="admin-btn"><Flag size={14} /> گزارش‌ها</Link>
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={(k) => setParam("tab", k)} />

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={15} />
          <input
            className="admin-input" placeholder="جست‌وجو با نام، یوزرنیم، عنوان یا آیدی…" value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!data ? (
        <div className={loading ? "admin-empty is-loading" : "admin-empty"}>
          {loading ? "در حال بارگذاری…" : failed ? "خطا در دریافت اطلاعات" : null}
          {!loading && failed && <button type="button" className="admin-btn" style={{ marginTop: 10 }} onClick={load}>تلاش دوباره</button>}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message={tab === "pending" ? "درخواستی در صف بررسی نیست" : tab === "suspended" ? "منتور تعلیق‌شده‌ای نیست" : "منتوری پیدا نشد"} />
      ) : (
        <>
          <div className="admin-table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>منتور</th><th>دسته‌ها</th><th>هویت</th><th>مدارک</th><th>وضعیت</th><th>امتیاز</th><th>شاگرد فعال</th><th>ثبت</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.profileId}>
                    <td>
                      <Link href={`/admin/mentors/${m.profileId}`} className="admin-user-cell">
                        <UserAvatar user={m.user} size={32} />
                        <span>
                          <span className="admin-user-cell-name">{displayName(m.user)}</span>
                          {m.user.username && <span className="admin-user-cell-sub">@{m.user.username}</span>}
                        </span>
                      </Link>
                    </td>
                    <td>{m.categories.length ? m.categories.map(categoryLabel).join("، ") : <span className="admin-muted">—</span>}</td>
                    <td><span className={`admin-badge ${V_BADGE[m.identityStatus]}`}>{VERIFICATION_LABELS[m.identityStatus]}</span></td>
                    <td>
                      {m.credentials.length === 0 ? <span className="admin-muted">—</span> : (
                        <span className="admin-badge-row">
                          {m.credentials.map((c) => (
                            <span key={c.category} className={`admin-badge ${V_BADGE[c.status]}`} title={VERIFICATION_LABELS[c.status]}>
                              {categoryLabel(c.category)}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge-row">
                        {m.suspendedAt ? <span className="admin-badge red">تعلیق</span>
                          : m.published ? <span className="admin-badge green">منتشرشده</span>
                          : <span className="admin-badge gray">پیش‌نویس</span>}
                        {m.user.isBlocked && <span className="admin-badge red">حساب مسدود</span>}
                        {m.pendingCount > 0 && <span className="admin-badge amber">{formatNumber(m.pendingCount)} در انتظار</span>}
                      </span>
                    </td>
                    <td className="admin-ltr">{m.ratingCount ? `${m.ratingAvg.toFixed(1)} (${formatNumber(m.ratingCount)})` : "—"}</td>
                    <td className="admin-ltr">{formatNumber(m.students)}</td>
                    <td className="admin-ltr">{formatDateShort(m.createdAt)}</td>
                    <td>
                      <Link href={`/admin/mentors/${m.profileId}`} className="admin-icon-btn" aria-label="جزئیات"><Eye size={15} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} onChange={(p) => setParam("page", String(p))} />
        </>
      )}
    </section>
  );
}

export default function AdminMentorsPage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">در حال بارگذاری…</div>}>
      <MentorsInner />
    </Suspense>
  );
}
