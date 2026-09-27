"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";

type ErrorRow = { id: string; service: string; severity: string; message: string; context: unknown; createdAt: string };
type Data = { errors: ErrorRow[]; total: number; pageSize: number };

const SEVERITIES = [
  { key: "", label: "همه" },
  { key: "CRITICAL", label: "بحرانی" },
  { key: "ERROR", label: "خطا" },
  { key: "WARNING", label: "هشدار" },
];
const SEVERITY_LABELS: Record<string, string> = { CRITICAL: "بحرانی", ERROR: "خطا", WARNING: "هشدار" };

function badgeClass(sev: string): string {
  if (sev === "CRITICAL" || sev === "ERROR") return "red";
  if (sev === "WARNING") return "amber";
  return "gray";
}

function hasContext(c: unknown): boolean {
  if (c == null) return false;
  if (typeof c === "object") return Object.keys(c as object).length > 0;
  return true;
}

export default function AdminSystemErrorsPage() {
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    const sp = new URLSearchParams({ page: String(page) });
    if (severity) sp.set("severity", severity);
    fetch(`/api/admin/errors?${sp.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => setData(d))
      .catch(() => { setFailed(true); setData(null); })
      .finally(() => setLoading(false));
  }, [severity, page]);
  useEffect(load, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">خطاها و لاگ‌ها</div>
          <div className="admin-section-hint">
            {data ? `${formatNumber(data.total)} رخداد` : "…"} — هر ردیف یک رخدادِ مجزاست؛ برای دیدنِ جزئیات روی ردیف بزن
          </div>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> {loading ? "در حال بارگذاری…" : "تازه‌سازی"}
          </button>
        </div>
      </div>

      <AdminTabBar items={SEVERITIES} active={severity} onChange={(v) => { setSeverity(v); setPage(1); setExpanded(null); }} />

      {!data ? (
        <div className={loading ? "admin-empty is-loading" : "admin-empty"}>
          {loading ? "در حال بارگذاری…" : "خطا در دریافت اطلاعات"}
          {!loading && failed && <button type="button" className="admin-btn" onClick={load}>تلاش دوباره</button>}
        </div>
      ) : data.errors.length === 0 ? (
        <EmptyState message={severity ? "رخدادی با این شدت ثبت نشده" : "خطایی ثبت نشده"} />
      ) : (
        <>
          <div className={`admin-table-wrap${loading ? " is-stale" : ""}`} aria-busy={loading}>
            <table className="admin-table">
              <thead><tr><th>شدت</th><th>سرویس</th><th>پیام</th><th>زمان</th><th /></tr></thead>
              <tbody>
                {data.errors.map((e) => {
                  const expandable = hasContext(e.context);
                  const open = expandable && expanded === e.id;
                  const toggle = () => setExpanded(open ? null : e.id);
                  return (
                    <Fragment key={e.id}>
                      <tr
                        className={`${expandable ? "is-expandable" : ""}${open ? " is-open" : ""}`}
                        onClick={expandable ? toggle : undefined}
                      >
                        <td><span className={`admin-badge ${badgeClass(e.severity)}`}>{SEVERITY_LABELS[e.severity] || e.severity}</span></td>
                        <td className="admin-ltr">{e.service}</td>
                        <td className="admin-cell-wrap">{e.message}</td>
                        <td className="admin-ltr">{formatDateTime(e.createdAt)}</td>
                        <td>
                          {expandable && (
                            <button
                              type="button" className="admin-icon-btn" aria-expanded={open} aria-label={open ? "بستن جزئیات" : "نمایش جزئیات"}
                              onClick={(ev) => { ev.stopPropagation(); toggle(); }}
                            >
                              <ChevronDown size={15} className="admin-expand-icon" />
                            </button>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr className="admin-log-detail">
                          <td colSpan={5}>
                            <pre className="admin-log-context">{JSON.stringify(e.context, null, 2)}</pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); setExpanded(null); }} />

          <div className="admin-section-hint is-after">
            این جدول یک لاگِ append-only است (نه گروه‌بندی‌شده). اطلاعات حساس (رمز/توکن/کلید API) هیچ‌وقت داخل این پیام‌ها ذخیره نمی‌شه.
          </div>
        </>
      )}
    </section>
  );
}
