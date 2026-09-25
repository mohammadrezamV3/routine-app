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

// لاگ append-only همه‌ی اقدامات پنل — کی، چی‌کار، روی کی، کِی
export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ entries: Entry[]; total: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/audit-log?page=${page}`).then((r) => (r.ok ? r.json() : null)).then(setData).finally(() => setLoading(false));
  }, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">لاگ فعالیت ادمین‌ها</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>همه‌ی اقدامات انجام‌شده در پنل — غیرقابل ویرایش و حذف.</div>
        </div>
      </div>
      {!data ? (
        <div className={loading ? "admin-empty is-loading" : "admin-empty"}>{loading ? "در حال بارگذاری…" : "خطا در دریافت اطلاعات"}</div>
      ) : data.entries.length === 0 ? <EmptyState /> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>ادمین</th><th>اقدام</th><th>هدف</th><th>زمان</th></tr></thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/admin/users/${e.actorUserId}`} className="admin-user-cell-name">
                        {e.actor ? [e.actor.name, e.actor.lastName].filter(Boolean).join(" ") || e.actor.username || "—" : "حذف‌شده"}
                      </Link>
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
