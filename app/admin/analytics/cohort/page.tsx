"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/admin/EmptyState";

type CohortRow = { monthKey: string; size: number; week1: number | null; month1: number | null; month2: number | null; month3: number | null };

function cellColor(pct: number | null): string {
  if (pct === null) return "transparent";
  const alpha = Math.min(0.85, 0.08 + (pct / 100) * 0.7);
  return `rgba(0,168,107,${alpha.toFixed(2)})`;
}

export default function AdminCohortPage() {
  const [rows, setRows] = useState<CohortRow[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/cohort").then((r) => r.json()).then((d) => setRows(d.cohorts));
  }, []);

  return (
    <section>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">Cohort — کاربران بر اساس ماه ثبت‌نام</span></div>
        {!rows ? (
          <div className="admin-empty is-loading">در حال بارگذاری…</div>
        ) : rows.every((r) => r.size === 0) ? (
          <EmptyState />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>ماه</th><th>تعداد کاربر</th><th>باقی‌مانده هفته اول</th><th>ماه اول</th><th>ماه دوم</th><th>ماه سوم</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.monthKey}>
                    <td className="mono" style={{ direction: "ltr", textAlign: "right" }}>{r.monthKey}</td>
                    <td>{r.size}</td>
                    {[r.week1, r.month1, r.month2, r.month3].map((v, i) => (
                      <td key={i} style={{ background: cellColor(v), fontWeight: 700 }}>{v === null ? "—" : `${v}%`}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="admin-section-hint">
        سلول «—» یعنی هنوز زمان کافی از ثبت‌نام این کوهورت نگذشته تا آن نقطه اندازه‌گیری بشه.
      </div>
    </section>
  );
}
