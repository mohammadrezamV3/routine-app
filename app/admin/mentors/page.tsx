"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { BadgeCheck, CircleSlash, Eye, Hourglass, RefreshCw, Search, XCircle } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { formatDateShort, formatNumber } from "@/lib/adminFormat";
import { MENTOR_CATEGORY_META, VERIFICATION_LABELS, VERIFICATION_SHORT, isMentorCategory } from "@/lib/mentorCategories";
import { tr } from "@/lib/i18n";

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
// توابع، نه ثابت سطح ماژول: برچسب‌ها موقع رندر به زبان جاری وابسته‌ان.
const tabLabels = (): Record<Tab, string> => ({
  pending: tr("صف احراز هویت", "Verification queue"),
  all: tr("همه مربی‌ها", "All mentors"),
  suspended: tr("تعلیق‌شده", "Suspended"),
});
const emptyLabels = (): Record<Tab, string> => ({
  pending: tr("مدرکی در صف بررسی نیست", "Nothing in the review queue"),
  all: tr("مربی‌ای پیدا نشد", "No mentors found"),
  suspended: tr("مربی تعلیق‌شده‌ای نیست", "No suspended mentors"),
});

const V_TONE: Record<VStatus, "green" | "red" | "amber" | "gray"> = { VERIFIED: "green", REJECTED: "red", PENDING: "amber", NOT_PROVIDED: "gray" };
const V_ICON: Record<VStatus, typeof Hourglass> = { VERIFIED: BadgeCheck, REJECTED: XCircle, PENDING: Hourglass, NOT_PROVIDED: CircleSlash };

function categoryLabel(c: string) {
  return isMentorCategory(c) ? MENTOR_CATEGORY_META[c].label : c;
}

// چیپ فشرده‌ی وضعیت احراز: برچسب کوتاه روی چیپ، برچسب کامل در title
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

  function setParam(key: string, value: string | null, replace = false) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") sp.delete(key); else sp.set(key, value);
    if (key !== "page") sp.delete("page");
    const qs = sp.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    if (replace) router.replace(href); else router.push(href);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // جست‌وجوی جدید → برگشت به صفحه‌ی ۱ (از طریق URL تا تب/صفحه قابل‌اشتراک بمونه).
  // replace نه push: هر حرف تایپ‌شده نباید یه قدم به تاریخچه‌ی «بازگشت» اضافه کنه.
  const pushedQ = useRef(q);
  useEffect(() => {
    const next = debounced.trim();
    if (next !== q) {
      pushedQ.current = next;
      setParam("q", next || null, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // q از بیرون عوض شد (لینک منوی کناری/دکمه‌ی بازگشت) → فیلد جست‌وجو هم همون بشه،
  // وگرنه متن قدیمی توی فیلد می‌موند و لیست فیلترنشده بود
  useEffect(() => {
    if (q === pushedQ.current) return; // همون تغییری که خودمون از فیلد فرستادیم
    pushedQ.current = q;
    setSearch(q);
    setDebounced(q);
  }, [q]);

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
  const labels = tabLabels();
  const tabItems = TABS.map((t) => ({
    key: t,
    label: data?.counts && data.counts[t] ? `${labels[t]} (${formatNumber(data.counts[t])})` : labels[t],
  }));

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">{tr("مربی‌ها", "Mentors")}</div>
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={(k) => setParam("tab", k)} />

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={15} strokeWidth={1.75} aria-hidden />
          <input
            className="admin-input" placeholder={tr("نام، یوزرنیم، عنوان یا آیدی", "Name, username, title or ID")} value={search}
            aria-label={tr("جست‌وجوی مربی", "Search mentors")}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!data ? (
        loading ? (
          <div className="admin-empty is-loading" role="status" aria-label={tr("در حال دریافت", "Loading")} />
        ) : failed ? (
          <div className="admin-empty">
            <span>{tr("فهرست مربی‌ها دریافت نشد", "Couldn't load the mentor list")}</span>
            <button type="button" className="admin-btn" onClick={load}><RefreshCw size={14} strokeWidth={1.75} aria-hidden /> {tr("تلاش دوباره", "Try again")}</button>
          </div>
        ) : null
      ) : rows.length === 0 ? (
        <EmptyState message={q ? tr("مربی‌ای با این جست‌وجو پیدا نشد", "No mentors match this search") : emptyLabels()[tab]} />
      ) : (
        <>
          <div className={`admin-table-wrap${loading ? " is-stale" : ""}`} aria-busy={loading}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{tr("مربی", "Mentor")}</th><th>{tr("دسته‌ها", "Categories")}</th><th>{tr("هویت", "Identity")}</th><th>{tr("مدارک تخصصی", "Credentials")}</th><th>{tr("وضعیت", "Status")}</th><th>{tr("امتیاز", "Rating")}</th><th>{tr("شاگرد فعال", "Active students")}</th><th>{tr("ثبت", "Joined")}</th><th />
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
                    <td>{m.categories.length ? m.categories.map(categoryLabel).join(tr("، ", ", ")) : <span className="admin-muted">—</span>}</td>
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
                        {m.suspendedAt ? <span className="admin-badge red">{tr("تعلیق", "Suspended")}</span>
                          : m.published ? <span className="admin-badge green">{tr("منتشرشده", "Published")}</span>
                          : <span className="admin-badge gray">{tr("منتشرنشده", "Unpublished")}</span>}
                        {m.user.isBlocked && <span className="admin-badge red">{tr("حساب مسدود", "Account blocked")}</span>}
                        {m.pendingCount > 0 && (
                          <span className="admin-badge amber" title={tr(`${formatNumber(m.pendingCount)} مورد ${VERIFICATION_LABELS.PENDING}`, `${formatNumber(m.pendingCount)} item(s): ${VERIFICATION_LABELS.PENDING}`)}>
                            <Hourglass size={13} strokeWidth={1.75} aria-hidden />{formatNumber(m.pendingCount)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="admin-ltr">{m.ratingCount ? `${m.ratingAvg.toFixed(1)} (${formatNumber(m.ratingCount)})` : "—"}</td>
                    <td className="admin-ltr">{formatNumber(m.students)}</td>
                    <td className="admin-ltr">{formatDateShort(m.createdAt)}</td>
                    <td>
                      <Link href={`/admin/mentors/${m.profileId}`} className="admin-icon-btn" aria-label={tr(`جزئیات ${displayName(m.user)}`, `Details of ${displayName(m.user)}`)}>
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
    <Suspense fallback={<div className="admin-empty is-loading" role="status" aria-label={tr("در حال دریافت", "Loading")} />}>
      <MentorsInner />
    </Suspense>
  );
}
