"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { Domain, DOMAINS, DOMAIN_LABELS_FA } from "@/lib/weeklyReport/metrics";

type DomainDetailResponse = {
  domain: Domain;
  weekStart: string;
  weekEnd: string;
  active: boolean;
  metric: { hasData: boolean; score: number | null; daysWithData: number; raw: Record<string, any> };
  comparison: { current: number | null; previousWeek: number | null; avg4Week: number | null };
};

const RAW_LABELS: Record<Domain, Record<string, string>> = {
  routine: { daysWithData: "روزهای دارای داده" },
  fitness: { completedSessions: "جلسات انجام‌شده", expectedSessions: "جلسات برنامه‌ریزی‌شده" },
  trading: { totalTrades: "تعداد معاملات", totalClosed: "معاملات بسته‌شده", totalWins: "معاملات سودده" },
  learning: { totalStations: "کل مراحل رودمپ‌ها", doneStations: "مراحل انجام‌شده" },
  nutrition: { avgKcal: "میانگین کالری روزانه", targetKcal: "هدف روزانه", loggingDays: "روزهای ثبت‌شده" },
};

function GateModuleContent() {
  const params = useParams<{ domain: string }>();
  const searchParams = useSearchParams();
  const offset = Number(searchParams.get("offset") || "0");
  const domain = params.domain as Domain;

  const [data, setData] = useState<DomainDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!DOMAINS.includes(domain)) return;
    setData(null);
    setError(null);
    fetch(`/api/reports/weekly/${domain}?offset=${offset}`)
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) { setError(body.error || "خطایی پیش اومد"); return; }
        setData(body);
      })
      .catch(() => setError("مشکلی در اتصال به سرور پیش اومد"));
  }, [domain, offset]);

  if (!DOMAINS.includes(domain)) return null;

  return (
    <section className="wr-page">
      <Link href="/report/weekly" className="wr-back-link"><ChevronRight size={16} /> بازگشت به گزارش هفتگی</Link>
      <h1>گزارش {DOMAIN_LABELS_FA[domain]}</h1>

      {error && <div className="wr-error-box">{error}</div>}

      {!error && !data && <div className="wr-loading-skel" aria-hidden="true"><div className="wr-skel-block" style={{ height: 140 }} /></div>}

      {data && !data.active && <div className="wr-empty-box">این بخش برای حساب تو فعال نیست.</div>}

      {data && data.active && !data.metric.hasData && (
        <div className="wr-empty-box">این هفته داده‌ای برای {DOMAIN_LABELS_FA[domain]} ثبت نشده.</div>
      )}

      {data && data.active && data.metric.hasData && (
        <>
          <div className="wr-score-card">
            <div className="wr-score-row">
              <div className="wr-score-num-wrap">
                <span className="wr-score-num">{data.metric.score ?? "—"}</span>
                <span className="wr-score-max">از ۱۰۰</span>
              </div>
            </div>
            <div className="wr-domain-compare-row">
              <span>هفته‌ی قبل: {data.comparison.previousWeek ?? "—"}</span>
              <span>میانگین ۴هفته: {data.comparison.avg4Week ?? "—"}</span>
            </div>
          </div>

          <div className="wr-block">
            <div className="wr-block-title">جزئیات</div>
            <div className="account-card">
              {Object.entries(data.metric.raw)
                .filter(([, v]) => v !== null && v !== undefined && typeof v !== "boolean")
                .map(([key, value]) => (
                  <div key={key} className="account-row2">
                    <span className="account-row2-body">
                      <span className="account-row2-label">{RAW_LABELS[domain]?.[key] || key}</span>
                    </span>
                    <span className="wr-domain-score">{String(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default function WeeklyDomainDetailPage() {
  const { status } = useSession();
  return status === "authenticated" ? (
    <ModuleGate module="AI_INSIGHT">
      <Suspense fallback={<PanelSkeleton />}>
        <GateModuleContent />
      </Suspense>
    </ModuleGate>
  ) : (
    <section className="wr-page">
      <h1>گزارش هفتگی</h1>
      <AuthGate message="برای دیدن گزارش هفتگی وارد شوید" />
    </section>
  );
}
