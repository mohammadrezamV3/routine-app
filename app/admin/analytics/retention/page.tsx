"use client";

import { useEffect, useState } from "react";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { formatPercent } from "@/lib/adminFormat";

const MODULES = [
  { key: "", label: "همه محصولات" },
  { key: "ROUTINE", label: "روتین" },
  { key: "EXERCISE", label: "بدنسازی" },
  { key: "CALORIE", label: "کالری" },
  { key: "TRADE", label: "ترید" },
  { key: "ROADMAP", label: "Skill / یادگیری" },
];

type Resp = { retention: { d1: number | null; d7: number | null; d30: number | null; cohortSize: number } };

export default function AdminRetentionPage() {
  const [moduleFilter, setModuleFilter] = useState("");
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (moduleFilter) sp.set("module", moduleFilter);
    fetch(`/api/admin/retention?${sp.toString()}`).then((r) => r.json()).then(setData);
  }, [moduleFilter]);

  return (
    <section>
      <div className="admin-chart-head" style={{ marginBottom: 18 }}>
        <div />
        <select className="admin-input" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          {MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>

      {!data ? (
        <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : data.retention.cohortSize === 0 ? (
        <div className="admin-empty">داده‌ای برای نمایش وجود ندارد</div>
      ) : (
        <>
          <KpiGrid>
            <KpiTile label="Retention روز ۱" value={formatPercent(data.retention.d1)} index={0} />
            <KpiTile label="Retention روز ۷" value={formatPercent(data.retention.d7)} index={1} />
            <KpiTile label="Retention روز ۳۰" value={formatPercent(data.retention.d30)} index={2} />
            <KpiTile label="حجم کوهورت (۶ ماه اخیر)" value={String(data.retention.cohortSize)} index={3} />
          </KpiGrid>
          <div className="admin-section-hint">
            «Retained» یعنی کاربر حداقل یک‌بار بعد از روز N دوباره وارد شده — بر اساس لاگ ورودهای واقعی، محدود به کاربرانی که ثبت‌نامشون ظرف ۶ ماه اخیر بوده.
          </div>
        </>
      )}
    </section>
  );
}
