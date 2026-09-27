"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { BadgeCheck, CircleSlash, Eye, Hourglass, RefreshCw, Search, XCircle } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { formatDateShort, formatNumber } from "@/lib/adminFormat";
import { MENTOR_CATEGORY_META, VERIFICATION_LABELS, VERIFICATION_SHORT, isMentorCategory } from "@/lib/mentorCategories";

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
const EMPTY_LABELS: Record<Tab, string> = {
  pending: "مدرکی در صف بررسی نیست",
  all: "منتوری پیدا نشد",
  suspended: "منتور تعلیق‌شده‌ای نیست",
};

const V_TONE: Record<VStatus, "green" | "red" | "amber" | "gray"> = { VERIFIED: "green", REJECTED: "red", PENDING: "amber", NOT_PROVIDED: "gray" };
const V_ICON: Record<VStatus, typeof Hourglass> = { VERIFIED: BadgeCheck, REJECTED: XCircle, PENDING: Hourglass, NOT_PROVIDED: CircleSlash };

function categoryLabel(c: string) {
  return isMentorCategory(c) ? MENTOR_CATEGORY_META[c].label : c;
}

// چیپِ فشرده‌ی وضعیتِ احراز: برچسبِ کوتاه روی چیپ، برچسبِ کامل در title
function VBadge({ status, children }: { status: VStatus; children?: React.ReactNode }) {
  const Icon = V_ICON[status];
  return (
    <span className={`admin-badge ${V_TONE[status]}`} title={VERIFICATION_LABELS[status]}>
      <Icon size={13} strokeWidth={1.75} aria-hidden />
      {children ?? VERIFICATION_SHORT[status]}
    </span>
  );
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
          {data && <div className="admin-section-hint" style={{ margin: 0 }}>{formatNumber(data.counts.all)} منتور</div>}
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={(k) => setParam("tab", k)} />

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={15} strokeWidth={1.75} aria-hidden />
          <input
            className="admin-input" placeholder="نام، یوزرنیم، عنوان یا آیدی" value={search}
            aria-label="جست‌وجوی منتور"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!data ? (
        loading ? (
          <div className="admin-empty is-loading" role="status" aria-label="در حال دریافت" />
        ) : failed ? (
          <div className="admin-empty">
            <span>فهرست منتورها دریافت نشد</span>
            <button type="button" className="admin-btn" onClick={load}><RefreshCw size={14} strokeWidth={1.75} aria-hidden /> تلاش دوباره</button>
          </div>
        ) : null
      ) : rows.length === 0 ? (
        <EmptyState message={q ? "منتوری با این جست‌وجو پیدا نشد" : EMPTY_LABELS[tab]} />
      ) : (
        <>
          <div className="admin-table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>منتور</th><th>دسته‌ها</th><th>هویت</th><th>مدارک تخصصی</th><th>وضعیت</th><th>امتیاز</th><th>شاگرد فعال</th><th>ثبت</th><th />
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
                          {m.user.username && <span className="admin-user-cell-sub admin-ltr">@{m.user.username}</span>}
                        </span>
                      </Link>
                    </td>
                    <td>{m.categories.length ? m.categories.map(categoryLabel).join("، ") : <span className="admin-muted">—</span>}</td>
                    <td><VBadge status={m.identityStatus} /></td>
                    <td>
                      {m.credentials.length === 0 ? <span className="admin-muted">—</span> : (
                        <span className="admin-badge-row">
                          {m.credentials.map((c) => (
                            <VBadge key={c.category} status={c.status}>{categoryLabel(c.category)}</VBadge>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge-row">
                        {m.suspendedAt ? <span className="admin-badge red">تعلیق</span>
                          : m.published ? <span className="admin-badge green">منتشرشده</span>
                          : <span className="admin-badge gray">منتشرنشده</span>}
                        {m.user.isBlocked && <span className="admin-badge red">حساب مسدود</span>}
                        {m.pendingCount > 0 && (
                          <span className="admin-badge amber" title={`${formatNumber(m.pendingCount)} مورد ${VERIFICATION_LABELS.PENDING}`}>
                            <Hourglass size={13} strokeWidth={1.75} aria-hidden />{formatNumber(m.pendingCount)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="admin-ltr">{m.ratingCount ? `${m.ratingAvg.toFixed(1)} (${formatNumber(m.ratingCount)})` : "—"}</td>
                    <td className="admin-ltr">{formatNumber(m.students)}</td>
                    <td className="admin-ltr">{formatDateShort(m.createdAt)}</td>
                    <td>
                      <Link href={`/admin/mentors/${m.profileId}`} className="admin-icon-btn" aria-label={`جزئیات ${displayName(m.user)}`}>
                        <Eye size={15} strokeWidth={1.75} aria-hidden />
                      </Link>
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
    <Suspense fallback={<div className="admin-empty is-loading" role="status" aria-label="در حال دریافت" />}>
      <MentorsInner />
    </Suspense>
  );
}
