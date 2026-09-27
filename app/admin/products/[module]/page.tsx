"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { EmptyState } from "@/components/admin/EmptyState";
import { adminFetch } from "@/components/admin/useAdminToast";
import { formatNumber } from "@/lib/adminFormat";

const MODULE_META: Record<string, { title: string; metricLabels: Record<string, string> }> = {
  routine: { title: "روتین", metricLabels: { totalRoutineItems: "تعداد برنامه‌ها (آیتم‌های روتین)", dailyEntriesInRange: "روزهای ثبت‌شده در بازه" } },
  exercise: { title: "بدنسازی", metricLabels: { totalPlans: "تعداد برنامه‌های تمرینی", aiGeneratedPlans: "ساخته‌شده با AI", logsInRange: "جلسه‌های ثبت‌شده در بازه" } },
  calorie: { title: "کالری", metricLabels: { foodLogsInRange: "ثبت غذا در بازه", aiScannedLogsInRange: "تحلیل تصویر با AI در بازه" } },
  trade: { title: "ترید", metricLabels: { entriesInRange: "معامله‌های ثبت‌شده در بازه" } },
  roadmap: { title: "Skill / یادگیری", metricLabels: { roadmapsInRange: "رودمپ‌های ساخته‌شده در بازه", aiGeneratedInRange: "ساخته‌شده با AI", stageCompletionPercent: "نرخ تکمیل مرحله‌ها" } },
};

type Resp = { analytics: { module: string; usersWithAccess: number; activeUsers: number; usageRatePercent: number | null; metrics: Record<string, number> } };

// نرخ استفاده/تکمیل یک نسبته نه تغییر — برخلاف formatPercent (که برای
// دلتا «+» جلوش می‌ذاره) بدون علامت نمایش داده می‌شه.
function ratio(n: number | null): string {
  return n === null ? "—" : `${n}%`;
}

function ProductInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const moduleSlug = (params?.module as string) || "routine";
  const meta = MODULE_META[moduleSlug];
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = searchParams.get("range") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  useEffect(() => {
    if (!meta) return;
    let cancelled = false;
    setData(null);
    setError(null);
    const sp = new URLSearchParams();
    if (range) sp.set("range", range);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    adminFetch<Resp>(`/api/admin/products/${moduleSlug}?${sp.toString()}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [meta, moduleSlug, range, from, to]);

  if (!meta) return <EmptyState message="این ماژول وجود ندارد" />;

  return (
    <section>
      <div className="admin-commerce-head">
        <div className="admin-page-kicker">{meta.title}</div>
        <RangePicker />
      </div>

      {error ? (
        <EmptyState message={error} />
      ) : !data ? (
        <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : (
        <KpiGrid>
          <KpiTile label="کاربران دارای دسترسی" value={formatNumber(data.analytics.usersWithAccess)} index={0} />
          <KpiTile label="کاربران فعال در این بازه" value={formatNumber(data.analytics.activeUsers)} index={1} />
          <KpiTile label="نرخ استفاده" value={ratio(data.analytics.usageRatePercent)} index={2} />
          {Object.entries(data.analytics.metrics).map(([key, value], i) => (
            <KpiTile
              key={key}
              label={meta.metricLabels[key] || key}
              value={key.toLowerCase().includes("percent") ? ratio(value) : formatNumber(value)}
              index={3 + i}
            />
          ))}
        </KpiGrid>
      )}
    </section>
  );
}

export default function AdminProductPage() {
  return (
    <Suspense fallback={<div className="admin-empty is-loading">در حال بارگذاری…</div>}>
      <ProductInner />
    </Suspense>
  );
}
