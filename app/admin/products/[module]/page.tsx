"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { formatNumber, formatPercent } from "@/lib/adminFormat";

const MODULE_META: Record<string, { title: string; metricLabels: Record<string, string> }> = {
  routine: { title: "روتین", metricLabels: { totalRoutineItems: "تعداد برنامه‌ها (آیتم‌های روتین)", dailyEntriesInRange: "روزهای ثبت‌شده در بازه" } },
  exercise: { title: "بدنسازی", metricLabels: { totalPlans: "تعداد برنامه‌های تمرینی", aiGeneratedPlans: "ساخته‌شده با AI", logsInRange: "جلسه‌های ثبت‌شده در بازه" } },
  calorie: { title: "کالری", metricLabels: { foodLogsInRange: "ثبت غذا در بازه", aiScannedLogsInRange: "تحلیل تصویر با AI در بازه" } },
  trade: { title: "ترید", metricLabels: { entriesInRange: "معامله‌های ثبت‌شده در بازه" } },
  roadmap: { title: "Skill / یادگیری", metricLabels: { roadmapsInRange: "رودمپ‌های ساخته‌شده در بازه", aiGeneratedInRange: "ساخته‌شده با AI", stationCompletionPercent: "نرخ تکمیل ایستگاه‌ها" } },
};

type Resp = { analytics: { module: string; usersWithAccess: number; activeUsers: number; usageRatePercent: number | null; metrics: Record<string, number> } };

function ProductInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const moduleSlug = (params?.module as string) || "routine";
  const meta = MODULE_META[moduleSlug] || MODULE_META.routine;
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    fetch(`/api/admin/products/${moduleSlug}?${sp.toString()}`).then((r) => r.json()).then(setData);
  }, [moduleSlug, searchParams]);

  return (
    <section>
      <div className="admin-chart-head" style={{ marginBottom: 18 }}>
        <div />
        <RangePicker />
      </div>

      {!data ? (
        <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : (
        <>
          <KpiGrid>
            <KpiTile label="کاربران دارای دسترسی" value={formatNumber(data.analytics.usersWithAccess)} index={0} />
            <KpiTile label="کاربران فعال در این بازه" value={formatNumber(data.analytics.activeUsers)} index={1} />
            <KpiTile label="نرخ استفاده" value={formatPercent(data.analytics.usageRatePercent)} index={2} />
            {Object.entries(data.analytics.metrics).map(([key, value], i) => (
              <KpiTile
                key={key}
                label={meta.metricLabels[key] || key}
                value={key.toLowerCase().includes("percent") ? `${value}%` : formatNumber(value)}
                index={3 + i}
              />
            ))}
          </KpiGrid>
        </>
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
