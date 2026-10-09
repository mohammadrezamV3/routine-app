"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { KpiGrid, KpiTile } from "@/components/admin/KpiTile";
import { EmptyState } from "@/components/admin/EmptyState";
import { adminFetch } from "@/components/admin/useAdminToast";
import { formatNumber } from "@/lib/adminFormat";
import { tr } from "@/lib/i18n";

// تابع، نه ثابت سطح ماژول: tr() باید موقع رندر زبان درخواست جاری رو بخونه.
const MODULE_META = (): Record<string, { title: string; metricLabels: Record<string, string> }> => ({
  routine: { title: tr("روتین", "Routine"), metricLabels: { totalRoutineItems: tr("تعداد برنامه‌ها (آیتم‌های روتین)", "Routine items"), dailyEntriesInRange: tr("روزهای ثبت‌شده در بازه", "Days logged in period") } },
  exercise: { title: tr("بدنسازی", "Workout"), metricLabels: { totalPlans: tr("تعداد برنامه‌های تمرینی", "Workout plans"), aiGeneratedPlans: tr("ساخته‌شده با AI", "Created with AI"), logsInRange: tr("جلسه‌های ثبت‌شده در بازه", "Sessions logged in period") } },
  calorie: { title: tr("کالری", "Calories"), metricLabels: { foodLogsInRange: tr("ثبت غذا در بازه", "Food logs in period") } },
  trade: { title: tr("ترید", "Trading"), metricLabels: { entriesInRange: tr("معامله‌های ثبت‌شده در بازه", "Trades logged in period") } },
  roadmap: { title: tr("Skill / یادگیری", "Skill / learning"), metricLabels: { roadmapsInRange: tr("رودمپ‌های ساخته‌شده در بازه", "Roadmaps created in period"), aiGeneratedInRange: tr("ساخته‌شده با AI", "Created with AI"), stageCompletionPercent: tr("نرخ تکمیل مرحله‌ها", "Stage completion rate") } },
});

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
  const meta = MODULE_META()[moduleSlug];
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

  if (!meta) return <EmptyState message={tr("این ماژول وجود ندارد", "This module doesn't exist")} />;

  return (
    <section>
      <div className="admin-commerce-head">
        <div className="admin-page-kicker">{meta.title}</div>
        <RangePicker />
      </div>

      {error ? (
        <EmptyState message={error} />
      ) : !data ? (
        <div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
      ) : (
        <KpiGrid>
          <KpiTile label={tr("کاربران دارای دسترسی", "Users with access")} value={formatNumber(data.analytics.usersWithAccess)} index={0} />
          <KpiTile label={tr("کاربران فعال در این بازه", "Active users in period")} value={formatNumber(data.analytics.activeUsers)} index={1} />
          <KpiTile label={tr("نرخ استفاده", "Usage rate")} value={ratio(data.analytics.usageRatePercent)} index={2} />
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
    <Suspense fallback={<div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>}>
      <ProductInner />
    </Suspense>
  );
}
