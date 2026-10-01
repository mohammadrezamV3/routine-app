"use client";

import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { useAdminData } from "@/components/admin/useAdminData";
import { formatNumber } from "@/lib/adminFormat";

type CohortRow = { monthKey: string; size: number; week1: number | null; month1: number | null; month2: number | null; month3: number | null };

// شدت رنگ هیت‌مپ — از متغیر اکسنت تم (نه سبز هاردکد) تا توی هر دو تم
// با بقیه‌ی پنل یکی باشه؛ سقف ۰٫۶ تا متن روی سلول همیشه خوانا بمونه.
function cellStyle(pct: number | null): React.CSSProperties | undefined {
  if (pct === null || !Number.isFinite(pct)) return undefined;
  const alpha = Math.min(0.6, 0.06 + (Math.max(0, Math.min(100, pct)) / 100) * 0.54);
  return { background: `rgba(var(--adm-accent-rgb),${alpha.toFixed(2)})` };
}

export default function AdminCohortPage() {
  const { data, error, reload } = useAdminData<{ cohorts: CohortRow[] }>("/api/admin/cohort");
  const rows = data?.cohorts ?? null;

  return (
    <section>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">Cohort — کاربران بر اساس ماه ثبت‌نام</span></div>
        {!rows ? (
          error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState />
        ) : rows.length === 0 || rows.every((r) => r.size === 0) ? (
          <EmptyState />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-cohort-table">
              <thead>
                <tr><th>ماه</th><th>تعداد کاربر</th><th>باقی‌مانده هفته اول</th><th>ماه اول</th><th>ماه دوم</th><th>ماه سوم</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.monthKey}>
                    <td className="mono admin-ltr">{r.monthKey}</td>
                    <td>{formatNumber(r.size)}</td>
                    {[r.week1, r.month1, r.month2, r.month3].map((v, i) => (
                      <td key={i} className="admin-cohort-cell" style={cellStyle(v)}>{v === null ? "—" : `${v}%`}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="admin-section-hint">
        سلول «—» یعنی هنوز زمان کافی از ثبت‌نام این کوهورت نگذشته تا آن نقطه اندازه‌گیری بشه (یا کوهورت خالیه).
      </div>
    </section>
  );
}
