"use client";

import { useState } from "react";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/EmptyState";
import { useAdminData } from "@/components/admin/useAdminData";
import { formatNumber } from "@/lib/adminFormat";

const MODULES = [
  { key: "", label: "همه محصولات" },
  { key: "ROUTINE", label: "روتین" },
  { key: "EXERCISE", label: "بدنسازی" },
  { key: "CALORIE", label: "کالری" },
  { key: "TRADE", label: "ترید" },
  { key: "ROADMAP", label: "Skill / یادگیری" },
];

type Resp = { retention: { d1: number | null; d7: number | null; d30: number | null; cohortSize: number } };

// نرخ (نه تغییر) — بدون علامت «+» که formatPercent برای رشد می‌ذاره
const formatRate = (n: number | null) => (n == null ? "—" : `${n}%`);

export default function AdminRetentionPage() {
  const [moduleFilter, setModuleFilter] = useState("");
  const { data, error, loading, reload } = useAdminData<Resp>(`/api/admin/retention${moduleFilter ? `?module=${encodeURIComponent(moduleFilter)}` : ""}`);

  return (
    <section>
      <div className="admin-range-bar">
        <label className="admin-field admin-inline-field">
          <span>محصول</span>
          <select className="admin-input" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            {MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
      </div>

      {!data ? (
        error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState />
      ) : (
        <div className={loading ? "admin-refreshing" : undefined} aria-busy={loading}>
          {error && <ErrorState message={error} onRetry={reload} />}
          {data.retention.cohortSize === 0 ? (
            <EmptyState />
          ) : (
            <>
              <KpiGrid>
                <KpiTile label="Retention روز 1" value={formatRate(data.retention.d1)} index={0} />
                <KpiTile label="Retention روز 7" value={formatRate(data.retention.d7)} index={1} />
                <KpiTile label="Retention روز 30" value={formatRate(data.retention.d30)} index={2} />
                <KpiTile label="حجم کوهورت (6 ماه اخیر)" value={formatNumber(data.retention.cohortSize)} index={3} />
              </KpiGrid>
              <div className="admin-section-hint">
                «Retained» یعنی کاربر حداقل یک‌بار بعد از روز N دوباره وارد شده — بر اساس لاگ ورودهای واقعی، محدود به کاربرانی که ثبت‌نامشون ظرف 6 ماه اخیر بوده.
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
