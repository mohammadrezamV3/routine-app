"use client";

import { Fragment, useEffect, useState } from "react";
import { EmptyState } from "@/components/admin/EmptyState";
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
      <div className="admin-tabs">
        {SEVERITIES.map((s) => (
          <button key={s.key} type="button" className={`admin-tab${severity === s.key ? " active" : ""}`} onClick={() => { setSeverity(s.key); setPage(1); }}>{s.label}</button>
        ))}
      </div>

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

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button type="button" className="admin-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</button>
              <span style={{ fontSize: 12, color: "var(--adm-muted)" }}>{page} از {totalPages}</span>
              <button type="button" className="admin-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</button>
            </div>
          )}

          <div className="admin-section-hint">
            «تعداد تکرار» چون این جدول از یک لاگِ append-ony (نه گروه‌بندی‌شده) میاد نمایش داده نمی‌شه — هر ردیف یک رخدادِ واقعیِ مجزاست. اطلاعاتِ حساس (رمز/توکن/کلیدِ API) هیچ‌وقت داخلِ این پیام‌ها ذخیره نمی‌شه.
          </div>
        </>
      )}
    </section>
  );
}
