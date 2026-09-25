import { useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import ProgressRing from "@/components/ProgressRing";
import { faNum, formatJalali, toJalali } from "@/lib/jalali";
import {
  SOCIAL_WEEKLY_DOMAIN_LABELS,
  SOCIAL_WEEKLY_DOMAINS,
  SOCIAL_WEEKLY_MIN_OFFSET,
  type SocialWeeklyDomain,
  type SocialWeeklyReportResponse,
} from "@/lib/social-contract";
import { useSocialApi } from "../api";
import { cacheKeys } from "../db";
import { describeSocialError } from "../errors";
import { useCachedResource } from "../hooks";
import { scoreColor } from "../logic";
import { ActionButton, EmptyState, ErrorNotice, Loading, LockedState, StaleNotice } from "../components/SocialUi";
import { DailyBarChart, DomainBars } from "../components/WeeklyCharts";

function jalaliOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? formatJalali(toJalali(y, m, d)) : iso;
}

const CONFIDENCE_LABEL = { low: "کم", medium: "متوسط", high: "زیاد" } as const;
const PRIORITY_LABEL = { high: "اولویت بالا", medium: "اولویت متوسط", low: "اولویت کم" } as const;

/** گزارش هفتگی — هفته‌ی جاری (زنده) و هفته‌های گذشته (snapshot)؛ نمودارها SVG سبک. */
export default function WeeklyReportScreen() {
  const api = useSocialApi();
  const [offset, setOffset] = useState(0);
  const res = useCachedResource<SocialWeeklyReportResponse>(cacheKeys.weekly(offset), () => api.weeklyReport(offset));
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const report = res.data?.report;

  async function regenerate() {
    if (refreshing) return;
    setRefreshing(true);
    setActionError(null);
    try {
      const fresh = await api.refreshWeeklyReport(offset);
      res.mutate(() => fresh);
    } catch (err) {
      setActionError(describeSocialError(err));
    } finally {
      setRefreshing(false);
    }
  }

  if (res.locked) {
    return (
      <div>
        <AppHeader title="گزارش هفتگی" showBack />
        <LockedState hint="گزارش هفتگی بخشی از ماژولِ AI Insight است." />
      </div>
    );
  }

  const domainOrder: SocialWeeklyDomain[] = SOCIAL_WEEKLY_DOMAINS;

  return (
    <div>
      <AppHeader title="گزارش هفتگی" showBack />
      <main className="px-4 pt-4 pb-8">
        <div className="mb-3 flex items-center justify-between rounded-card border px-2 py-1.5" style={{ borderColor: "var(--surface-line)" }}>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(SOCIAL_WEEKLY_MIN_OFFSET, o - 1))}
            disabled={offset <= SOCIAL_WEEKLY_MIN_OFFSET}
            aria-label="هفته‌ی قبل"
            className="flex items-center justify-center disabled:opacity-40"
            style={{ width: 40, height: 40 }}
          >
            <ChevronRight size={20} color="var(--text)" />
          </button>
          <div className="text-center font-vazir">
            <div className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
              {offset === 0 ? "هفته‌ی جاری" : offset === -1 ? "هفته‌ی قبل" : `${faNum(-offset)} هفته پیش`}
            </div>
            {report && (
              <div className="text-[11.5px]" style={{ color: "var(--muted)" }}>
                {jalaliOf(report.weekStart)} تا {jalaliOf(report.weekEnd)}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset >= 0}
            aria-label="هفته‌ی بعد"
            className="flex items-center justify-center disabled:opacity-40"
            style={{ width: 40, height: 40 }}
          >
            <ChevronLeft size={20} color="var(--text)" />
          </button>
        </div>

        <StaleNotice online={res.online} staleSince={res.staleSince} />
        <ErrorNotice message={res.error || actionError} />

        {res.loading && !report ? (
          <Loading />
        ) : !report ? (
          <EmptyState text={res.online ? "گزارشی برای این هفته نیست" : "این هفته هنوز ذخیره نشده — نیاز به اینترنت"} />
        ) : (
          <div className="flex flex-col gap-3">
            <section className="flex items-center gap-4 rounded-card border p-4" style={{ borderColor: "var(--surface-line)" }}>
              <ProgressRing pct={(report.overallScore ?? 0) / 100} size={84} strokeWidth={8} color={scoreColor(report.overallScore)}>
                <span className="font-vazir text-[20px] font-bold" style={{ color: "var(--text)" }}>
                  {report.overallScore == null ? "—" : faNum(report.overallScore)}
                </span>
              </ProgressRing>
              <div className="font-vazir">
                <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                  امتیازِ کلیِ هفته
                </div>
                <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                  اطمینان: {CONFIDENCE_LABEL[report.confidence] ?? report.confidence}
                  {report.status === "COLLECTING" && " · هفته هنوز در جریان است"}
                </div>
              </div>
            </section>

            <Card title="عملکردِ روزانه">
              <DailyBarChart days={report.dailyBreakdown} />
            </Card>

            <Card title="حوزه‌ها">
              <DomainBars domains={domainOrder} scores={report.domainScores} comparison={report.comparison} />
            </Card>

            {(report.wins.length > 0 || report.problems.length > 0) && (
              <Card title="نقاطِ قوت و ضعف">
                <ul className="flex flex-col gap-1.5 font-vazir text-[13px] leading-6">
                  {report.wins.map((w) => (
                    <li key={`w${w}`} style={{ color: "var(--pnl-win)" }}>
                      ✓ <span style={{ color: "var(--text)" }}>{w}</span>
                    </li>
                  ))}
                  {report.problems.map((p) => (
                    <li key={`p${p}`} style={{ color: "var(--pnl-loss)" }}>
                      ! <span style={{ color: "var(--text)" }}>{p}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {report.prediction && (
              <Card title="پیش‌بینی">
                <p className="font-vazir text-[13px] leading-6" style={{ color: "var(--text)" }}>
                  {report.prediction.message}
                </p>
                <p className="mt-1 font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
                  {report.prediction.evidence}
                </p>
              </Card>
            )}

            {report.aiSummary && (
              <Card title="جمع‌بندیِ هوش مصنوعی" icon={<Sparkles size={15} color="var(--accent)" />}>
                <p className="font-vazir text-[13px] leading-7" style={{ color: "var(--text)" }}>
                  {report.aiSummary}
                </p>
              </Card>
            )}

            {!!report.aiInsights?.length && (
              <Card title="بینش‌ها">
                <ul className="flex flex-col gap-2.5">
                  {report.aiInsights.map((i) => (
                    <li key={i.title} className="font-vazir">
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                        {i.title}
                      </div>
                      <div className="text-[12.5px] leading-6" style={{ color: "var(--text)" }}>
                        {i.description}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                        {i.evidence}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {!!report.aiRecommendations?.length && (
              <Card title="پیشنهادها">
                <ul className="flex flex-col gap-2.5">
                  {report.aiRecommendations.map((r) => (
                    <li key={r.title} className="font-vazir">
                      <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                        {r.title}
                        <span className="text-[10.5px] font-normal" style={{ color: "var(--muted)" }}>
                          {PRIORITY_LABEL[r.priority]}
                          {r.domain && SOCIAL_WEEKLY_DOMAIN_LABELS[r.domain as SocialWeeklyDomain]
                            ? ` · ${SOCIAL_WEEKLY_DOMAIN_LABELS[r.domain as SocialWeeklyDomain]}`
                            : ""}
                        </span>
                      </div>
                      <div className="text-[12.5px] leading-6" style={{ color: "var(--text)" }}>
                        {r.description}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="flex justify-center pt-1">
              <ActionButton online={res.online} busy={refreshing} tone="ghost" onClick={regenerate}>
                <span className="inline-flex items-center gap-1">
                  <RefreshCw size={14} /> {report.aiSummary ? "تولیدِ دوباره‌ی گزارش" : "ساختِ تحلیلِ هوش مصنوعی"}
                </span>
              </ActionButton>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-card border p-4" style={{ borderColor: "var(--surface-line)" }}>
      <h2 className="mb-3 flex items-center gap-1.5 font-vazir text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
