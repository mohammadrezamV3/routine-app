"use client";

// فصل «حرف مربی»: دیدن، ساخت و بازسازی تحلیل AI همین هفته + افزودن به هدف‌ها.
import { useEffect, useState } from "react";
import { Plus, RotateCw, Sparkles } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type AiCoach } from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import { Spinner } from "./Spinner";
import { Reveal } from "./WeeklyLetterShared";
import { LiveChapter, humanAiError, sendGoalDraft, type LetterChapterExtra } from "./WeeklyLetterLiveKit";
import type { LetterChapterProps } from "./WeeklyLetterCtx";
import { waFetch } from "./WeeklyAnalysisKit";

const priorityLabel = (p: string): string =>
  p === "high" ? tr("اولویت بالا", "High priority") : p === "low" ? tr("اولویت پایین", "Low priority") : tr("اولویت متوسط", "Medium priority");

function hhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function WeeklyLetterCoach({ ctx, no }: LetterChapterProps & LetterChapterExtra) {
  const a = ctx.analysis;
  const [ai, setAi] = useState<AiCoach>(a.ai);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setAi(a.ai); }, [a.ai]);
  useEffect(() => { setError(null); }, [ctx.weekStart]);

  const hasData = a.overall.score !== null;
  // بدون تحلیل و بدون امکان ساخت: چیزی برای نشون‌دادن نیست
  if (!ai && !(a.aiAvailable && hasData)) return null;

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await waFetch<{ ai: AiCoach }>("/api/analysis/weekly/ai", { method: "POST", body: JSON.stringify({ offset: ctx.offset }) });
      setAi(data.ai);
      ctx.reload();
    } catch (e) {
      setError(humanAiError((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function addGoal(r: NonNullable<AiCoach>["recommendations"][number]) {
    sendGoalDraft({ domain: r.domain, title: r.title });
    document.getElementById("goals")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <LiveChapter id="coach" no={no} title={tr("حرف مربی", "Coach's note")} icon={Sparkles}>
      <div className="wl-coach" aria-busy={busy}>
        {!ai ? (
          <Reveal className="wl-card wl-live-coach-empty">
            <span className="wl-coach-ico"><Sparkles size={18} /></span>
            <p>{tr("مربی اعداد همین هفته رو می‌خونه و یک جمع‌بندی کوتاه با چند پیشنهاد عملی برای هفته‌ی بعد می‌نویسه.", "The coach reads this week's numbers and writes a short summary with a few practical suggestions for next week.")}</p>
            <button type="button" className="account-outline-btn wl-live-btn" onClick={generate} disabled={busy}>
              {busy ? <Spinner size={14} label={null} /> : <><Sparkles size={14} />{tr("ساختن حرف مربی", "Generate coach's note")}</>}
            </button>
          </Reveal>
        ) : (
          <>
            <Reveal className="wl-card wl-coach-quote">
              <span className="wl-coach-ico"><Sparkles size={18} /></span>
              <p>{ai.summary}</p>
            </Reveal>
            {ai.recommendations.length > 0 && (
              <ol className="wl-rec-list">
                {ai.recommendations.map((r, i) => (
                  <Reveal key={`${r.title}-${i}`} as="li" className={`wl-card wl-rec is-${r.priority}`} delay={0.05 * (i % 3)}>
                    <span className="wl-rec-no" aria-hidden="true">{i + 1}</span>
                    <div className="wl-live-rec-body">
                      <h3>{r.title}</h3>
                      <p>{r.description}</p>
                      <div className="wl-rec-meta">
                        <span className="wl-tag">{priorityLabel(r.priority)}</span>
                        {r.domain && <span className="wl-tag">{ANALYSIS_DOMAIN_LABELS[r.domain]}</span>}
                        {ctx.isCurrent && (
                          <button type="button" className="wl-live-ghost wl-live-addgoal" onClick={() => addGoal(r)}>
                            <Plus size={13} />{tr("افزودن به هدف‌ها", "Add to goals")}
                          </button>
                        )}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </ol>
            )}
            <div className="wl-live-coach-foot">
              {ai.generatedAt && <span className="wl-live-note">{tr("ساخته‌شده ساعت", "Generated at")} <b>{hhmm(ai.generatedAt)}</b></span>}
              {a.aiAvailable && (
                <button type="button" className="wl-live-ghost" onClick={generate} disabled={busy} aria-label={tr("ساختن دوباره‌ی حرف مربی", "Regenerate coach's note")}>
                  {busy ? <Spinner size={13} label={null} /> : <><RotateCw size={13} />{tr("تحلیل دوباره", "Re-analyze")}</>}
                </button>
              )}
            </div>
          </>
        )}
        {error && <div className="wl-live-error" role="alert">{error}</div>}
      </div>
    </LiveChapter>
  );
}
