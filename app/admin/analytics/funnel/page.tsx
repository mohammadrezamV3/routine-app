"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatNumber } from "@/lib/adminFormat";

type Step = { key: string; label: string; count: number };

function FunnelInner() {
  const searchParams = useSearchParams();
  const [steps, setSteps] = useState<Step[] | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    fetch(`/api/admin/funnel?${sp.toString()}`).then((r) => r.json()).then((d) => setSteps(d.steps));
  }, [searchParams]);

  const maxCount = steps?.[0]?.count || 1;

  return (
    <section>
      <div className="admin-chart-head" style={{ marginBottom: 18 }}>
        <div />
        <RangePicker />
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">Funnel تبدیل کاربر (بر اساس کاربران ثبت‌نام‌کرده در این بازه)</span></div>
        {!steps ? (
          <div className="admin-empty is-loading">در حال بارگذاری…</div>
        ) : steps[0].count === 0 ? (
          <EmptyState message="در این بازه ثبت‌نام جدیدی نبوده" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map((s, i) => {
              const prev = i > 0 ? steps[i - 1].count : s.count;
              const convFromPrev = prev > 0 ? Math.round((s.count / prev) * 1000) / 10 : null;
              const widthPercent = maxCount > 0 ? Math.max(4, (s.count / maxCount) * 100) : 0;
              return (
                <div key={s.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                    <span style={{ color: "var(--adm-text)", fontWeight: 700 }}>{s.label}</span>
                    <span style={{ color: "var(--adm-muted)", direction: "ltr" }}>
                      {formatNumber(s.count)} {i > 0 && convFromPrev !== null && <span style={{ color: convFromPrev >= 50 ? "var(--adm-accent)" : "var(--adm-amber)" }}> ({convFromPrev}٪ از مرحله قبل)</span>}
                    </span>
                  </div>
                  <div style={{ height: 26, borderRadius: 8, background: "rgba(255,255,255,.04)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${widthPercent}%`, background: "linear-gradient(90deg, rgba(0,168,107,.55), #00A86B)", borderRadius: 8, transition: "width .3s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="admin-section-hint">
        «مشاهده پلن» و «شروع خرید» فقط از تاریخ فعال‌سازی ردیابی این دو رویداد قابل‌ثبت هستن — بازه‌های قدیمی‌تر برای این دو مرحله صفر نشون می‌دن.
      </div>
    </section>
  );
}

export default function AdminFunnelPage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">در حال بارگذاری…</div>}>
      <FunnelInner />
    </Suspense>
  );
}
