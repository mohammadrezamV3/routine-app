"use client";

import { Fragment, useEffect, useState } from "react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { formatDateTime } from "@/lib/adminFormat";

type ErrorRow = { id: string; service: string; severity: string; message: string; context: any; createdAt: string };

const SEVERITIES = [
  { key: "", label: "همه" },
  { key: "CRITICAL", label: "بحرانی" },
  { key: "ERROR", label: "خطا" },
  { key: "WARNING", label: "هشدار" },
];

function badgeClass(sev: string): string {
  if (sev === "CRITICAL") return "red";
  if (sev === "WARNING") return "amber";
  return "gray";
}

export default function AdminSystemErrorsPage() {
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ errors: ErrorRow[]; total: number; pageSize: number } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams({ page: String(page) });
    if (severity) sp.set("severity", severity);
    fetch(`/api/admin/errors?${sp.toString()}`).then((r) => r.json()).then(setData);
  }, [severity, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <AdminTabBar items={SEVERITIES} active={severity} onChange={(v) => { setSeverity(v); setPage(1); }} />

      {!data ? (
        <div className="admin-empty">در حال بارگذاری…</div>
      ) : data.errors.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>شدت</th><th>سرویس</th><th>پیام</th><th>تعداد تکرار امروز</th><th>زمان</th></tr></thead>
              <tbody>
                {data.errors.map((e) => (
                  <Fragment key={e.id}>
                    <tr onClick={() => setExpanded(expanded === e.id ? null : e.id)} style={{ cursor: "pointer" }}>
                      <td><span className={`admin-badge ${badgeClass(e.severity)}`}>{e.severity}</span></td>
                      <td>{e.service}</td>
                      <td style={{ whiteSpace: "normal", maxWidth: 420 }}>{e.message}</td>
                      <td>—</td>
                      <td style={{ direction: "ltr", textAlign: "right" }}>{formatDateTime(e.createdAt)}</td>
                    </tr>
                    {expanded === e.id && e.context && (
                      <tr>
                        <td colSpan={5}>
                          <pre style={{ fontSize: 11, color: "var(--adm-muted)", whiteSpace: "pre-wrap", margin: 0, direction: "ltr", textAlign: "left" }}>
                            {JSON.stringify(e.context, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />

          <div className="admin-section-hint">
            «تعداد تکرار» چون این جدول از یک لاگِ append-ony (نه گروه‌بندی‌شده) میاد نمایش داده نمی‌شه — هر ردیف یک رخدادِ واقعیِ مجزاست. اطلاعاتِ حساس (رمز/توکن/کلیدِ API) هیچ‌وقت داخلِ این پیام‌ها ذخیره نمی‌شه.
          </div>
        </>
      )}
    </section>
  );
}
