"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { BarChart3 } from "lucide-react";
import type { AiCoach, AnalysisDomain, ReflectionDto, WeeklyAnalysis, WeeklyGoalDto } from "@/lib/weeklyAnalysis/types";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { DashCard } from "@/components/DashCard";
import { WeeklyAnalysisHeader } from "@/components/WeeklyAnalysisHeader";
import { WeeklyAnalysisHero } from "@/components/WeeklyAnalysisHero";
import { WeeklyAnalysisDomainGrid } from "@/components/WeeklyAnalysisDomainGrid";
import { WeeklyAnalysisHeatmap } from "@/components/WeeklyAnalysisHeatmap";
import { WeeklyAnalysisTrend } from "@/components/WeeklyAnalysisTrend";
import { WeeklyAnalysisInsights } from "@/components/WeeklyAnalysisInsights";
import { WeeklyAnalysisCoach } from "@/components/WeeklyAnalysisCoach";
import { WeeklyAnalysisAchievements } from "@/components/WeeklyAnalysisAchievements";
import { WeeklyAnalysisGoals, type GoalDraft } from "@/components/WeeklyAnalysisGoals";
import { WeeklyAnalysisReflection } from "@/components/WeeklyAnalysisReflection";
import { WeeklyAnalysisShare } from "@/components/WeeklyAnalysisShare";
import { WeeklyAnalysisEmpty } from "@/components/WeeklyAnalysisEmpty";
import { waFetch } from "@/components/WeeklyAnalysisShared";

// اگه از یه لینک مشخص باز شده باشه (مثلا نوتیفِ «آنالیز هفته‌ی قبلت آماده‌ست»
// با ?offset=-1)، همون هفته باز می‌شه. از window.location مستقیم می‌خونیم
// (نه useSearchParams) تا Suspense لازم نباشه — هم‌الگوی بقیه‌ی صفحه‌ها.
function initialOffsetFromUrl(): number {
  if (typeof window === "undefined") return 0;
  const v = Number(new URLSearchParams(window.location.search).get("offset"));
  return Number.isInteger(v) && v <= 0 && v > -520 ? v : 0;
}

function PageTitle({ analysis }: { analysis: WeeklyAnalysis | null }) {
  return (
    <div className="trade-head-row wa-title-row">
      <div className="wa-title">
        <span className="page-title-icon"><BarChart3 /></span>
        <h1>آنالیز هفتگی</h1>
      </div>
      <WeeklyAnalysisShare analysis={analysis} />
    </div>
  );
}

function WeeklyAnalysisContent() {
  const [offset, setOffset] = useState(initialOffsetFromUrl);
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState<GoalDraft | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback((off: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    waFetch<{ analysis: WeeklyAnalysis }>(`/api/analysis/weekly?offset=${off}`, { signal: ctrl.signal })
      .then((data) => { if (!ctrl.signal.aborted) setAnalysis(data.analysis); })
      .catch((e) => { if (!ctrl.signal.aborted && (e as Error)?.name !== "AbortError") setError((e as Error).message); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
  }, []);

  useEffect(() => {
    load(offset);
    // آدرس هم‌گام با هفته‌ی انتخابی — رفرش/اشتراکِ لینک همون هفته رو باز می‌کنه
    try {
      const url = new URL(window.location.href);
      if (offset === 0) url.searchParams.delete("offset");
      else url.searchParams.set("offset", String(offset));
      window.history.replaceState(window.history.state, "", url.toString());
    } catch { /* بی‌اهمیت */ }
    return () => abortRef.current?.abort();
  }, [offset, load]);

  // داده‌ی نمایش‌داده‌شده فقط وقتی معتبره که مالِ همین هفته‌ی انتخابی باشه
  const current = analysis && analysis.offset === offset ? analysis : null;

  const patch = (fn: (a: WeeklyAnalysis) => WeeklyAnalysis) => setAnalysis((a) => (a ? fn(a) : a));
  const onAi = (ai: AiCoach) => patch((a) => ({ ...a, ai }));
  const onGoalAdded = (g: WeeklyGoalDto) => patch((a) => ({ ...a, nextWeekGoals: [...a.nextWeekGoals, g] }));
  const onGoalDeleted = (id: string) =>
    patch((a) => ({ ...a, goals: a.goals.filter((g) => g.id !== id), nextWeekGoals: a.nextWeekGoals.filter((g) => g.id !== id) }));
  const onReflection = (reflection: ReflectionDto) => patch((a) => ({ ...a, reflection }));
  const onAddGoalFromCoach = (d: { domain: AnalysisDomain | null; title: string }) =>
    setGoalDraft({ ...d, nonce: Date.now() });

  const hasAnyData = !!current && (current.domains.some((d) => d.hasData) || current.overall.score !== null);

  return (
    <section className="wa-page">
      <PageTitle analysis={current} />

      <WeeklyAnalysisHeader
        offset={offset}
        weekLabel={current?.weekLabel ?? null}
        loading={loading}
        onChange={(o) => setOffset(Math.min(0, o))}
      />

      {error && !loading ? (
        <DashCard className="wa-error-card">
          <div>{error}</div>
          <button type="button" className="account-outline-btn" onClick={() => load(offset)}>تلاش دوباره</button>
        </DashCard>
      ) : !current ? (
        <div className="wa-skeleton"><PanelSkeleton rows={3} /></div>
      ) : (
        <div className={loading ? "wa-layout wa-stale" : "wa-layout"}>
          {hasAnyData ? (
            <>
              <div className="wa-span-2"><WeeklyAnalysisHero analysis={current} /></div>
              <div className="wa-span-2"><WeeklyAnalysisDomainGrid domains={current.domains} days={current.days} /></div>
              <WeeklyAnalysisHeatmap domains={current.domains} days={current.days} />
              <WeeklyAnalysisTrend trend={current.trend} />
              <WeeklyAnalysisInsights insights={current.insights} />
              <WeeklyAnalysisCoach
                offset={offset}
                ai={current.ai}
                aiAvailable={current.aiAvailable}
                canAddGoal={offset === 0}
                onAi={onAi}
                onAddGoal={onAddGoalFromCoach}
              />
              <WeeklyAnalysisAchievements achievements={current.achievements} />
            </>
          ) : (
            <div className="wa-span-2"><WeeklyAnalysisEmpty domains={current.domains} isCurrentWeek={current.isCurrentWeek} /></div>
          )}
          <WeeklyAnalysisGoals
            offset={offset}
            goals={current.goals}
            nextWeekGoals={current.nextWeekGoals}
            domains={current.domains}
            draft={goalDraft}
            onAdded={onGoalAdded}
            onDeleted={onGoalDeleted}
          />
          <div className={hasAnyData ? "wa-span-2" : undefined}>
            <WeeklyAnalysisReflection
              key={current.weekStart}
              offset={offset}
              reflection={current.reflection}
              onSaved={onReflection}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default function WeeklyAnalysisPage() {
  const { status } = useSession();
  if (status === "authenticated") {
    return (
      <ModuleGate module="AI_INSIGHT">
        <WeeklyAnalysisContent />
      </ModuleGate>
    );
  }
  return (
    <section className="wa-page">
      <PageTitle analysis={null} />
      {status === "loading" ? <PanelSkeleton rows={3} /> : <AuthGate message="برای دیدن آنالیز هفتگی وارد شوید" />}
    </section>
  );
}
