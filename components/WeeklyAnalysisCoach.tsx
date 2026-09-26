"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, RotateCw } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type AiCoach, type AnalysisDomain } from "@/lib/weeklyAnalysis/types";
import { DashCard } from "./DashCard";
import { AiSparkleIcon } from "./AiSparkleIcon";
import { Spinner } from "./Spinner";
import { waFetch } from "./WeeklyAnalysisShared";

type Rec = NonNullable<AiCoach>["recommendations"][number];

const PRIORITY_LABELS: Record<Rec["priority"], string> = { high: "اولویت بالا", medium: "اولویت متوسط", low: "اولویت کم" };

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// مربیِ هوشمند — فقط با درخواستِ صریحِ کاربر ساخته می‌شه (GET صفحه هیچ‌وقت
// AI صدا نمی‌زنه). نتیجه سمتِ سرور کش می‌شه و با «بازسازی» دوباره ساخته می‌شه.
export function WeeklyAnalysisCoach({
  offset,
  ai,
  aiAvailable,
  canAddGoal,
  onAi,
  onAddGoal,
}: {
  offset: number;
  ai: AiCoach;
  aiAvailable: boolean;
  canAddGoal: boolean;
  onAi: (ai: AiCoach) => void;
  onAddGoal: (draft: { domain: AnalysisDomain | null; title: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await waFetch<{ ai: AiCoach }>("/api/analysis/weekly/ai", {
        method: "POST",
        body: JSON.stringify({ offset }),
      });
      onAi(data.ai);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashCard className="wa-coach-card">
      <div className="wa-card-head">
        <h2 className="wa-card-title"><AiSparkleIcon size={17} still />مربی هوشمند</h2>
        {ai && aiAvailable && (
          <button type="button" className="account-outline-btn muted wa-small-btn" onClick={generate} disabled={busy} aria-label="بازسازی تحلیل مربی">
            {busy ? <Spinner size={13} /> : <><RotateCw size={13} />بازسازی</>}
          </button>
        )}
      </div>

      {!ai ? (
        aiAvailable ? (
          <div className="wa-coach-empty">
            <p>مربی هوشمند اعداد همین هفته رو می‌خونه و یه جمع‌بندی کوتاه با چند پیشنهاد عملی برای هفته‌ی بعد می‌ده.</p>
            <button type="button" className="account-outline-btn wa-coach-cta" onClick={generate} disabled={busy}>
              {busy ? <Spinner size={15} /> : <><AiSparkleIcon size={15} still />ساخت تحلیل مربی</>}
            </button>
          </div>
        ) : (
          <div className="wa-empty-inline">تحلیل مربی هوشمند فعلا در دسترس نیست.</div>
        )
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className={busy ? "wa-stale" : undefined}>
          <p className="wa-coach-summary">{ai.summary}</p>
          {ai.recommendations.length > 0 && (
            <ul className="wa-rec-list">
              {ai.recommendations.map((r, i) => (
                <li key={i} className="wa-rec">
                  <div className="wa-rec-head">
                    <span className="wa-rec-title">{r.title}</span>
                    <span className={`wa-priority ${r.priority}`}>{PRIORITY_LABELS[r.priority]}</span>
                  </div>
                  <div className="wa-rec-desc">{r.description}</div>
                  <div className="wa-rec-foot">
                    {r.domain ? <span className="wa-tag">{ANALYSIS_DOMAIN_LABELS[r.domain]}</span> : <span />}
                    {canAddGoal && (
                      <button
                        type="button"
                        className="wa-ghost wa-link-btn"
                        onClick={() => onAddGoal({ domain: r.domain, title: r.title })}
                      >
                        <Plus size={13} />هدف
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {ai.generatedAt && <div className="wa-coach-meta">ساخته‌شده ساعت <span className="mono">{formatGeneratedAt(ai.generatedAt)}</span></div>}
        </motion.div>
      )}

      {error && <div className="wa-error-inline">{error}</div>}
    </DashCard>
  );
}
