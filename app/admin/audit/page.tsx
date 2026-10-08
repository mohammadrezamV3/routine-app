"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { formatDateTime } from "@/lib/adminFormat";
import { auditLabel } from "@/lib/adminAuditLabels";

type Entry = {
  id: string; action: string; targetType: string | null; targetId: string | null; meta: any; createdAt: string; actorUserId: string;
  actor: { id: string; name: string | null; lastName: string | null; username: string | null } | null;
};

// لاگ append-only همه‌ی اقدامات پنل — کی، چی‌کار، روی کی، کی
export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ entries: Entry[]; total: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    // صفحه‌ی قبلی اگه دیرتر جواب بده نباید صفحه‌ی جدید رو بپوشونه
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/audit-log?page=${page}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) { setData(d); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, reload]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">لاگ فعالیت ادمین‌ها</div>
          <div className="admin-section-hint admin-page-sub">همه‌ی اقدامات انجام‌شده در پنل — غیرقابل ویرایش و حذف.</div>
        </div>
      </div>
      {failed && !loading && (
        <div className="admin-empty">
          <span>خطا در دریافت اطلاعات</span>
          <button type="button" className="admin-btn sm" onClick={() => setReload((n) => n + 1)}>تلاش دوباره</button>
        </div>
      )}
      {!data ? (
        !failed && <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : data.entries.length === 0 ? <EmptyState message="هنوز اقدامی ثبت نشده" /> : (
        <>
          <div className={`admin-table-wrap${loading ? " is-refreshing" : ""}`} aria-busy={loading}>
            <table className="admin-table">
              <thead><tr><th>ادمین</th><th>اقدام</th><th>هدف</th><th>زمان</th></tr></thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.actor ? (
                        <Link href={`/admin/users/${e.actorUserId}`} className="admin-user-cell-name">
                          {[e.actor.name, e.actor.lastName].filter(Boolean).join(" ") || (e.actor.username ? `@${e.actor.username}` : "بدون نام")}
                        </Link>
                      ) : <span className="admin-muted">حساب حذف‌شده</span>}
                    </td>
                    <td>{auditLabel(e.action)}</td>
                    <td>
                      {e.targetType === "User" && e.targetId && e.action !== "user.hard_delete"
                        ? <Link href={`/admin/users/${e.targetId}`} className="admin-ltr admin-link">{e.targetId.slice(0, 10)}…</Link>
                        : <span className="admin-muted admin-ltr">{e.targetType ? `${e.targetType}${e.targetId ? ` · ${e.targetId.slice(0, 10)}` : ""}` : "—"}</span>}
                    </td>
                    <td className="admin-ltr">{formatDateTime(e.createdAt)}</td>
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
