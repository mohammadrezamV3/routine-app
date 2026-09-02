"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw, TrendingDown } from "lucide-react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { Domain, DOMAINS } from "@/lib/weeklyReport/metrics";
import { WeekSelector } from "@/components/weeklyReport/WeekSelector";
import { WeeklyScoreCard } from "@/components/weeklyReport/WeeklyScoreCard";
import { DomainScoreRow, DomainScoreRowData } from "@/components/weeklyReport/DomainScoreRow";
import { DailyPerformanceStrip } from "@/components/weeklyReport/DailyPerformanceStrip";
import { WinsList, ProblemsList } from "@/components/weeklyReport/WinsProblemsList";
import { InsightsList } from "@/components/weeklyReport/InsightsList";
import { RecommendationsList } from "@/components/weeklyReport/RecommendationsList";
import { AskArionPanel } from "@/components/weeklyReport/AskArionPanel";

type WeeklyReportResponse = {
  weekStart: string; weekEnd: string; status: string;
  overallScore: number | null; confidence: string;
  domainScores: Record<Domain, { active: boolean; hasData: boolean; score: number | null; confidence: string }>;
  dailyBreakdown: { date: string; weekday: string; domains: Partial<Record<Domain, number | null>> }[];
  wins: string[]; problems: string[];
  comparison: Record<Domain, { current: number | null; previousWeek: number | null; avg4Week: number | null }>;
  aiSummary: string | null;
  aiRecommendations: { title: string; description: string; priority: string; domain: string | null }[] | null;
  aiInsights: { title: string; description: string; evidence: string; confidence: string }[] | null;
  baselines: { domain: Domain; average: number; weeksConsidered: number }[];
  prediction: { domain: Domain; message: string; confidence: string; evidence: string } | null;
};

// اگه از یه لینک مشخص باز شده باشه (مثلا نوتیف «گزارش هفتگی‌ات آماده‌ست»
// که به هفته‌ی -۱ لینک می‌ده)، همون هفته رو باز کن — نه همیشه هفته‌ی جاری.
// از window.location مستقیم می‌خونیم (نه useSearchParams) تا نیازی به
// Suspense نباشه، هم‌الگوی بقیه‌ی صفحه‌های این پروژه.
function initialOffsetFromUrl(): number {
  if (typeof window === "undefined") return 0;
  const v = Number(new URLSearchParams(window.location.search).get("offset"));
  return Number.isInteger(v) && v <= 0 ? v : 0;
}

function WeeklyReportContent() {
  const [offset, setOffset] = useState(initialOffsetFromUrl);
  const [report, setReport] = useState<WeeklyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function loadReport() {
    setLoading(true);
    setError(null);
    fetch(`/api/reports/weekly?offset=${offset}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) { setError(data.error || "خطایی پیش اومد"); setReport(null); return; }
        setReport(data.report);
      })
      .catch(() => setError("مشکلی در اتصال به سرور پیش اومد"))
      .finally(() => setLoading(false));
  }

  useEffect(loadReport, [offset]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/weekly/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offset }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "خطایی پیش اومد"); return; }
      setReport(data.report);
    } catch {
      setError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setRefreshing(false);
    }
  }

  const hasAnyActiveDomain = report && DOMAINS.some((d) => report.domainScores[d]?.active);
  const hasAnyData = report && DOMAINS.some((d) => report.domainScores[d]?.hasData);
  const baselineOf = (d: Domain) => report?.baselines.find((b) => b.domain === d)?.average ?? null;

  return (
    <section className="wr-page">
      <h1>گزارش هفتگی</h1>
      <div className="account-content-hint">عملکرد این هفته‌ات، مقایسه با هفته‌ی قبل، و پیشنهاد برای هفته‌ی بعد</div>

      {report && (
        <WeekSelector weekStartIso={report.weekStart} weekEndIso={report.weekEnd} offset={offset} onChange={setOffset} />
      )}

      {loading && !report ? (
        <div className="wr-loading-skel" aria-hidden="true">
          <div className="wr-skel-block" style={{ height: 120 }} />
          <div className="wr-skel-block" style={{ height: 180 }} />
        </div>
      ) : error ? (
        <div className="wr-error-box">
          {error}
          <button type="button" className="account-outline-btn" onClick={loadReport} style={{ marginTop: 10 }}>تلاش دوباره</button>
        </div>
      ) : report && !hasAnyActiveDomain ? (
        <div className="wr-empty-box">
          هنوز داده کافی برای گزارش هفتگی نداریم.
          <br />از امروز فعالیت‌هایت را ثبت کن — آریون از هفته‌ی آینده اولین تحلیل کاملت را آماده می‌کند.
        </div>
      ) : report ? (
        <>
          <WeeklyScoreCard
            overallScore={report.overallScore}
            previousOverallScore={null}
            confidence={report.confidence}
            aiSummary={report.aiSummary}
            status={report.status}
          />

          {report.prediction && (
            <div className="wr-prediction-banner">
              <TrendingDown size={16} />
              <div>
                <div>{report.prediction.message}</div>
                <div className="wr-prediction-evidence">{report.prediction.evidence}</div>
              </div>
            </div>
          )}

          {!hasAnyData && (
            <div className="wr-empty-box">این هفته هنوز فعالیتی برای دامنه‌های فعالت ثبت نشده.</div>
          )}

          <div className="wr-block">
            <div className="wr-block-title">عملکرد بر اساس بخش</div>
            <div className="account-card">
              {DOMAINS.map((d) => (
                <DomainScoreRow
                  key={d}
                  href={`/report/weekly/${d}?offset=${offset}`}
                  data={{
                    domain: d,
                    active: report.domainScores[d].active,
                    hasData: report.domainScores[d].hasData,
                    score: report.domainScores[d].score,
                    previousWeek: report.comparison[d]?.previousWeek ?? null,
                    baseline: baselineOf(d),
                  } as DomainScoreRowData}
                />
              ))}
            </div>
          </div>

          <div className="wr-block">
            <div className="wr-block-title">عملکرد روزانه</div>
            <DailyPerformanceStrip days={report.dailyBreakdown} />
          </div>

          <WinsList items={report.wins} />
          <ProblemsList items={report.problems} />
          <InsightsList items={report.aiInsights} />
          <RecommendationsList items={report.aiRecommendations} weekStart={report.weekStart} />
          <AskArionPanel offset={offset} />

          <button type="button" className="wr-refresh-btn" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "wr-spin" : ""} />
            {refreshing ? "در حال تولید دوباره…" : "تولید دوباره‌ی تحلیل هوشمند"}
          </button>
        </>
      ) : null}
    </section>
  );
}

export default function WeeklyReportPage() {
  const { status } = useSession();
  return status === "authenticated" ? (
    <ModuleGate module="AI_INSIGHT">
      <WeeklyReportContent />
    </ModuleGate>
  ) : (
    <section className="wr-page">
      <h1>گزارش هفتگی</h1>
      <AuthGate message="برای دیدن گزارش هفتگی وارد شوید" />
    </section>
  );
}
